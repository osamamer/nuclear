import { listen } from '@tauri-apps/api/event';

import type { PlaylistIndexNode, Track } from '@nuclearplayer/model';

import { usePlaylistDownloadProgressStore } from '../../stores/playlistDownloadProgressStore';
import { usePlaylistStore } from '../../stores/playlistStore';
import { getSetting, useSettingsStore } from '../../stores/settingsStore';
import { errorMessage } from '../../utils/errorMessage';
import { Logger } from '../logger';
import { playlistFileService } from '../playlistFileService';
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
const QUEUED_PREVIEW_COUNT = 4;
const PROGRESS_SYNC_INTERVAL_MS = 100;
const FAILURE_RETRY_DELAY_MS = 3000;
const REPEATED_FAILURE_RETRY_DELAY_MS = 60000;

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

  const pendingTracks: { track: Track; playlistId: string }[] = [];
  const queuedKeys = new Set<string>();
  const activeKeys = new Set<string>();
  const failedKeys = new Set<string>();
  const trackTitles = new Map<string, string>();
  const progressByKey = new Map<string, number>();
  let activeDownloads = 0;
  let consecutiveFailures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let progressSyncTimer: ReturnType<typeof setTimeout> | undefined;
  let scanAllPromise: Promise<void> | undefined;
  let streamingProviderId = providersHost.getActive('streaming');
  let streamingProviderReady = hasActiveStreamingProvider();

  const syncProgress = () => {
    const activeTasks = Array.from(activeKeys).flatMap((key) => {
      const title = trackTitles.get(key);
      return title ? [{ key, title, progress: progressByKey.get(key) }] : [];
    });
    const queuedTasks = pendingTracks
      .slice(0, QUEUED_PREVIEW_COUNT)
      .map(({ track }) => ({
        key: trackDownloadKey(track),
        title: track.title,
      }));
    usePlaylistDownloadProgressStore
      .getState()
      .setQueue(activeTasks, queuedTasks, pendingTracks.length);
  };

  const scheduleProgressSync = () => {
    if (progressSyncTimer !== undefined) {
      return;
    }
    progressSyncTimer = setTimeout(() => {
      progressSyncTimer = undefined;
      syncProgress();
    }, PROGRESS_SYNC_INTERVAL_MS);
  };

  const isEnabled = () =>
    (getSetting('core.playback.autoDownloadPlaylists') as boolean) ?? false;
  const selectedPlaylistIds = (): string[] => {
    const value = getSetting('core.playback.autoDownloadPlaylistIds');
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : [];
  };
  const isSelected = (id: string) => selectedPlaylistIds().includes(id);

  usePlaylistDownloadProgressStore.getState().setIsScanning(true);

  const enqueueTrack = async (track: Track, playlistId: string) => {
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
    if (!isEnabled() || !isSelected(playlistId)) {
      queuedKeys.delete(key);
      return;
    }
    pendingTracks.push({ track, playlistId });
    scheduleProgressSync();
    pumpQueue();
  };

  const scanPlaylist = async (
    playlist: { items: { track: Track }[] },
    playlistId: string,
  ) => {
    for (const item of playlist.items) {
      if (!isEnabled() || !isSelected(playlistId)) {
        return;
      }
      await enqueueTrack(item.track, playlistId);
    }
  };

  const scanAllPlaylists = (): Promise<void> => {
    if (scanAllPromise) {
      return scanAllPromise;
    }
    const scan = async () => {
      if (!isEnabled()) {
        return;
      }
      const availableIds = new Set(
        playlistIds(usePlaylistStore.getState().index),
      );
      const ids = selectedPlaylistIds().filter((id) => availableIds.has(id));
      for (const id of ids) {
        if (!isEnabled() || !isSelected(id)) {
          return;
        }
        const playlist = await playlistFileService.loadPlaylist(id);
        if (playlist) {
          await scanPlaylist(playlist, id);
        }
      }
    };
    scanAllPromise = scan().finally(() => {
      scanAllPromise = undefined;
    });
    return scanAllPromise;
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
    if (
      !isEnabled() ||
      !hasActiveStreamingProvider() ||
      retryTimer !== undefined
    ) {
      return;
    }

    while (activeDownloads < DOWNLOAD_CONCURRENCY && pendingTracks.length > 0) {
      const next = pendingTracks.shift();
      if (!next) {
        continue;
      }
      const { track, playlistId } = next;
      const key = trackDownloadKey(track);
      queuedKeys.delete(key);
      if (!isSelected(playlistId)) {
        continue;
      }
      activeKeys.add(key);
      progressByKey.delete(key);
      activeDownloads += 1;
      scheduleProgressSync();

      void download(track)
        .then(() => {
          consecutiveFailures = 0;
          if (retryTimer !== undefined) {
            clearTimeout(retryTimer);
            retryTimer = undefined;
          }
          usePlaylistDownloadProgressStore.getState().recordResult(true);
        })
        .catch((error) => {
          consecutiveFailures += 1;
          if (retryTimer !== undefined) {
            clearTimeout(retryTimer);
          }
          retryTimer = setTimeout(
            () => {
              retryTimer = undefined;
              pumpQueue();
            },
            consecutiveFailures >= 3
              ? REPEATED_FAILURE_RETRY_DELAY_MS
              : FAILURE_RETRY_DELAY_MS,
          );
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
          scheduleProgressSync();
        });
    }
  }

  void initializeTrackDownloadCatalog()
    .then(scanAllPlaylists)
    .then(() => {
      usePlaylistDownloadProgressStore.getState().setIsScanning(false);
      pumpQueue();
      scheduleProgressSync();
    })
    .catch((error) => {
      void Logger.playlists.warn(
        `Failed to scan playlists for downloads: ${errorMessage(error)}`,
      );
      usePlaylistDownloadProgressStore.getState().setIsScanning(false);
      pumpQueue();
      scheduleProgressSync();
    });

  usePlaylistStore.subscribe((state, previousState) => {
    if (state.playlists !== previousState.playlists) {
      const changedPlaylists = Array.from(state.playlists).flatMap(
        ([id, playlist]) =>
          previousState.playlists.get(id) === playlist || !isSelected(id)
            ? []
            : [{ id, playlist }],
      );
      void Promise.all(
        changedPlaylists.map(({ id, playlist }) => scanPlaylist(playlist, id)),
      )
        .then(pumpQueue)
        .catch((error) => {
          void Logger.playlists.warn(
            `Failed to scan loaded playlists for downloads: ${errorMessage(error)}`,
          );
        });
    }
  });

  providersHost.subscribe(() => {
    const nextProviderId = providersHost.getActive('streaming');
    const nextProviderReady = hasActiveStreamingProvider();
    if (
      nextProviderId === streamingProviderId &&
      nextProviderReady === streamingProviderReady
    ) {
      return;
    }
    streamingProviderId = nextProviderId;
    streamingProviderReady = nextProviderReady;
    if (!nextProviderReady) {
      return;
    }
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
        previousState.values['core.playback.autoDownloadPlaylists'] ||
      state.values['core.playback.autoDownloadPlaylistIds'] !==
        previousState.values['core.playback.autoDownloadPlaylistIds']
    ) {
      pendingTracks.length = 0;
      queuedKeys.clear();
      consecutiveFailures = 0;
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      scheduleProgressSync();
      if (isEnabled()) {
        failedKeys.clear();
        void (scanAllPromise ?? Promise.resolve())
          .then(scanAllPlaylists)
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
      scheduleProgressSync();
    }
  });
};
