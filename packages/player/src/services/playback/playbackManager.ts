import type { AudioSource } from '@nuclearplayer/hifi';
import type { QueueItem, Track } from '@nuclearplayer/model';

import { useQueueStore } from '../../stores/queueStore';
import { getSetting } from '../../stores/settingsStore';
import { useSoundStore } from '../../stores/soundStore';
import { eventBus } from '../eventBus';
import { rewindGate, skipAttemptGate } from '../skipGate';

export type StartTrackOptions = {
  autoPlay: boolean;
};

export class PlaybackManager {
  private mountedItemId: string | null = null;
  private playRequested = false;

  play = (): void => {
    const { status } = useSoundStore.getState();
    if (status === 'playing') {
      return;
    }
    if (status === 'paused') {
      useSoundStore.getState().play();
      return;
    }

    const item = useQueueStore.getState().getCurrentItem();
    if (!item) {
      return;
    }
    if (this.mountedItemId !== item.id) {
      this.playRequested = true;
      return;
    }

    useSoundStore.getState().play();
    eventBus.emit('trackStarted', item.track);
  };

  playTracks = (tracks: Track[], playlistId?: string, startIndex = 0): void => {
    const queue = useQueueStore.getState();
    const started = playlistId
      ? queue.playPlaylist(tracks, playlistId, startIndex)
      : queue.replaceQueue(tracks, undefined, startIndex);
    if (!started) {
      return;
    }
    this.play();
  };

  pause = (): void => {
    this.playRequested = false;
    useSoundStore.getState().pause();
  };

  toggle = (): void => {
    if (useSoundStore.getState().status === 'playing') {
      this.pause();
      return;
    }
    this.play();
  };

  startTrack = (
    item: QueueItem,
    source: AudioSource,
    options: StartTrackOptions,
  ): void => {
    useSoundStore.getState().setSrc(source);
    this.mountedItemId = item.id;

    const shouldPlay = options.autoPlay || this.playRequested;
    this.playRequested = false;

    if (!shouldPlay) {
      return;
    }

    useSoundStore.getState().play();

    const isResumingMidTrack = source.startPositionSeconds !== undefined;
    if (isResumingMidTrack) {
      return;
    }

    eventBus.emit('trackStarted', item.track);
  };

  finishTrack = (): void => {
    const item = useQueueStore.getState().getCurrentItem();
    if (!item) {
      return;
    }

    eventBus.emit('trackFinished', item.track);
    skipAttemptGate.release();

    const repeatMode = (getSetting('core.playback.repeat') as string) ?? 'off';
    if (repeatMode === 'one') {
      rewindGate.restartTrack();
      useSoundStore.getState().restart();
      eventBus.emit('trackStarted', item.track);
      return;
    }

    useQueueStore.getState().goToNext('automatic');
  };

  sourceReady = (): void => {
    this.updateMountedItem({ status: 'success' });
  };

  sourceFailed = (message: string): void => {
    this.updateMountedItem({ status: 'error', error: message });
  };

  private updateMountedItem(updates: Partial<QueueItem>): void {
    if (!this.mountedItemId) {
      return;
    }
    useQueueStore.getState().updateItemState(this.mountedItemId, updates);
  }
}

export const playbackManager = new PlaybackManager();
