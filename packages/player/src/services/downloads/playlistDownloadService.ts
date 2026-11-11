import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';

import { i18n } from '@nuclearplayer/i18n';
import type { PlaylistIndexNode, Track } from '@nuclearplayer/model';

import { usePlaylistStore } from '../../stores/playlistStore';
import { getSetting, useSettingsStore } from '../../stores/settingsStore';
import { errorMessage } from '../../utils/errorMessage';
import { Logger } from '../logger';
import { providersHost } from '../providersHost';
import { hasActiveStreamingProvider, streamingHost } from '../streamingHost';
import { candidatesForTrack } from '../streamResolution/candidateSource';
import { downloadTrack } from '../tauri/trackDownloads';
import {
  findDownloadedTrack,
  initializeTrackDownloadCatalog,
  saveDownloadedTrack,
  trackDownloadKey,
} from './trackDownloadCatalog';

const DOWNLOAD_CONCURRENCY = 4;
const DOWNLOAD_TOAST_ID = 'playlist-auto-download';

type DownloadProgress = {
  trackKey: string;
  status: 'progress' | 'failed';
  downloadedBytes: number;
  totalBytes: number | null;
};

const playlistIds = (nodes: PlaylistIndexNode[]): string[] =>
  nodes.flatMap((node) =>
    node.kind === 'playlist' ? [node.id] : playlistIds(node.playlists),
  );

const containerForStream = (
  stream: NonNullable<Track['streamCandidates']>[number]['stream'],
): string => {
  const container = stream?.container?.toLowerCase();
  if (
    container &&
    ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav', 'webm'].includes(
      container,
    )
  ) {
    return container;
  }
  const mimeType = stream?.mimeType?.toLowerCase() ?? '';
  if (mimeType.includes('webm')) {
    return 'webm';
  }
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }
  if (mimeType.includes('flac')) {
    return 'flac';
  }
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a';
  }
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    return 'mp3';
  }
  return 'mp3';
};

let isStarted = false;

export const startPlaylistDownloadService = (): void => {
  if (isStarted) {
    return;
  }
  isStarted = true;

  const pendingTracks: Track[] = [];
  const queuedKeys = new Set<string>();
  const activeKeys = new Set<string>();
  const failedKeys = new Set<string>();
  const trackTitles = new Map<string, string>();
  let activeDownloads = 0;
  let initialScanComplete = false;
  let completedCount = 0;
  let failedCount = 0;

  const isEnabled = () =>
    (getSetting('core.playback.autoDownloadPlaylists') as boolean) ?? true;

  const showProgress = (title: string, percent?: number) => {
    toast.loading(
      i18n.t('playlists:autoDownloadProgress', {
        title,
        completed: completedCount,
        failed: failedCount,
        progress: percent ?? '…',
      }),
      { id: DOWNLOAD_TOAST_ID },
    );
  };

  const showFinishedIfIdle = () => {
    if (
      !initialScanComplete ||
      pendingTracks.length > 0 ||
      activeDownloads > 0 ||
      (completedCount === 0 && failedCount === 0)
    ) {
      return;
    }

    const message = i18n.t('playlists:autoDownloadFinished', {
      completed: completedCount,
      failed: failedCount,
    });
    if (failedCount > 0) {
      toast.error(message, { id: DOWNLOAD_TOAST_ID });
    } else {
      toast.success(message, { id: DOWNLOAD_TOAST_ID });
    }
    completedCount = 0;
    failedCount = 0;
  };

  const enqueueTrack = async (track: Track) => {
    const key = trackDownloadKey(track);
    if (queuedKeys.has(key) || activeKeys.has(key) || failedKeys.has(key)) {
      return;
    }
    queuedKeys.add(key);
    try {
      if (await findDownloadedTrack(track)) {
        queuedKeys.delete(key);
        return;
      }
    } catch (error) {
      void Logger.playlists.warn(
        `Failed to check local track ${track.title}: ${errorMessage(error)}`,
      );
    }
    trackTitles.set(key, track.title);
    pendingTracks.push(track);
    pumpQueue();
  };

  const scanLoadedPlaylists = async () => {
    const playlists = Array.from(
      usePlaylistStore.getState().playlists.values(),
    );
    for (const playlist of playlists) {
      for (const item of playlist.items) {
        await enqueueTrack(item.track);
      }
    }
  };

  const scanAllPlaylists = async () => {
    const ids = playlistIds(usePlaylistStore.getState().index);
    for (const id of ids) {
      const playlist = await usePlaylistStore.getState().loadPlaylist(id);
      if (!playlist) {
        continue;
      }
      for (const item of playlist.items) {
        await enqueueTrack(item.track);
      }
    }
  };

  const download = async (track: Track): Promise<void> => {
    const candidates = await candidatesForTrack(track);
    if (!candidates?.length) {
      throw new Error('No streaming candidates found');
    }

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const resolved =
          await streamingHost.resolveStreamForCandidate(candidate);
        const stream = resolved?.stream;
        if (
          !stream ||
          (stream.protocol !== 'http' && stream.protocol !== 'https')
        ) {
          continue;
        }
        const fileName = await downloadTrack(
          stream.url,
          trackDownloadKey(track),
          containerForStream(stream),
        );
        await saveDownloadedTrack(track, fileName);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No downloadable audio stream found');
  };

  function pumpQueue() {
    if (!isEnabled() || !hasActiveStreamingProvider()) {
      return;
    }

    while (activeDownloads < DOWNLOAD_CONCURRENCY && pendingTracks.length > 0) {
      const track = pendingTracks.shift();
      if (!track) {
        continue;
      }
      const key = trackDownloadKey(track);
      queuedKeys.delete(key);
      activeKeys.add(key);
      activeDownloads += 1;
      showProgress(track.title);

      void download(track)
        .then(() => {
          completedCount += 1;
        })
        .catch((error) => {
          failedCount += 1;
          failedKeys.add(key);
          void Logger.playlists.warn(
            `Failed to auto-download playlist track ${track.title}: ${errorMessage(error)}`,
          );
        })
        .finally(() => {
          activeKeys.delete(key);
          activeDownloads -= 1;
          pumpQueue();
          showFinishedIfIdle();
        });
    }
  }

  void initializeTrackDownloadCatalog()
    .then(scanAllPlaylists)
    .then(() => {
      initialScanComplete = true;
      pumpQueue();
      showFinishedIfIdle();
    })
    .catch((error) => {
      void Logger.playlists.warn(
        `Failed to scan playlists for downloads: ${errorMessage(error)}`,
      );
      initialScanComplete = true;
      pumpQueue();
    });

  usePlaylistStore.subscribe((state, previousState) => {
    if (state.playlists !== previousState.playlists) {
      void scanLoadedPlaylists()
        .then(pumpQueue)
        .catch((error) => {
          void Logger.playlists.warn(
            `Failed to scan loaded playlists for downloads: ${errorMessage(error)}`,
          );
        });
    }
  });

  providersHost.subscribe(() => {
    failedKeys.clear();
    void scanAllPlaylists()
      .then(pumpQueue)
      .catch((error) => {
        void Logger.playlists.warn(
          `Failed to scan playlists for downloads: ${errorMessage(error)}`,
        );
      });
  });

  useSettingsStore.subscribe((state, previousState) => {
    if (
      state.values['core.playback.autoDownloadPlaylists'] !==
      previousState.values['core.playback.autoDownloadPlaylists']
    ) {
      if (isEnabled()) {
        failedKeys.clear();
        void scanAllPlaylists()
          .then(pumpQueue)
          .catch((error) => {
            void Logger.playlists.warn(
              `Failed to scan playlists for downloads: ${errorMessage(error)}`,
            );
          });
      } else {
        pumpQueue();
      }
    }
  });

  void listen<DownloadProgress>('playlist-download:progress', (event) => {
    const title = trackTitles.get(event.payload.trackKey);
    if (title && event.payload.status === 'progress') {
      const percent = event.payload.totalBytes
        ? Math.min(
            100,
            Math.round(
              (event.payload.downloadedBytes / event.payload.totalBytes) * 100,
            ),
          )
        : undefined;
      showProgress(title, percent);
    }
  });
};
