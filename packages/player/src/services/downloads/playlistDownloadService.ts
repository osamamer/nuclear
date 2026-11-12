import { listen } from '@tauri-apps/api/event';

import type { PlaylistIndexNode, Track } from '@nuclearplayer/model';

import { usePlaylistDownloadProgressStore } from '../../stores/playlistDownloadProgressStore';
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
  const progressByKey = new Map<string, number>();
  let activeDownloads = 0;

  const syncProgress = () => {
    const activeTasks = Array.from(activeKeys).flatMap((key) => {
      const title = trackTitles.get(key);
      return title ? [{ key, title, progress: progressByKey.get(key) }] : [];
    });
    const queuedTasks = pendingTracks.map((track) => ({
      key: trackDownloadKey(track),
      title: track.title,
    }));
    usePlaylistDownloadProgressStore
      .getState()
      .setQueue(activeTasks, queuedTasks);
  };

  const isEnabled = () =>
    (getSetting('core.playback.autoDownloadPlaylists') as boolean) ?? true;

  usePlaylistDownloadProgressStore.getState().setIsScanning(true);

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
    syncProgress();
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
      progressByKey.delete(key);
      activeDownloads += 1;
      syncProgress();

      void download(track)
        .then(() => {
          usePlaylistDownloadProgressStore.getState().recordResult(true);
        })
        .catch((error) => {
          usePlaylistDownloadProgressStore.getState().recordResult(false);
          failedKeys.add(key);
          void Logger.playlists.warn(
            `Failed to auto-download playlist track ${track.title}: ${errorMessage(error)}`,
          );
        })
        .finally(() => {
          activeKeys.delete(key);
          progressByKey.delete(key);
          trackTitles.delete(key);
          activeDownloads -= 1;
          pumpQueue();
          syncProgress();
        });
    }
  }

  void initializeTrackDownloadCatalog()
    .then(scanAllPlaylists)
    .then(() => {
      usePlaylistDownloadProgressStore.getState().setIsScanning(false);
      pumpQueue();
      syncProgress();
    })
    .catch((error) => {
      void Logger.playlists.warn(
        `Failed to scan playlists for downloads: ${errorMessage(error)}`,
      );
      usePlaylistDownloadProgressStore.getState().setIsScanning(false);
      pumpQueue();
      syncProgress();
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
      if (percent === undefined) {
        progressByKey.delete(event.payload.trackKey);
      } else {
        progressByKey.set(event.payload.trackKey, percent);
      }
      syncProgress();
    }
  });
};
