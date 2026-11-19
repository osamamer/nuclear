import { waitFor } from '@testing-library/react';

import type { QueueItem, StreamCandidate } from '@nuclearplayer/model';

import { saveDownloadedTrack } from '../services/downloads/trackDownloadCatalog';
import { providersHost } from '../services/providersHost';
import { useQueueStore } from '../stores/queueStore';
import { setSetting } from '../stores/settingsStore';
import { useSoundStore } from '../stores/soundStore';
import { useStartupStore } from '../stores/startupStore';
import { useStreamVerificationStore } from '../stores/streamVerificationStore';
import {
  createMockCandidate,
  createMockStream,
  StreamingProviderBuilder,
} from '../test/builders/StreamingProviderBuilder';
import { createQueueItem } from '../test/fixtures/queue';
import { QueueWrapper } from './Queue.test-wrapper';

export const STUDIO = createMockCandidate('studio', 'Song (Studio)');
export const LIVE = createMockCandidate('live', 'Song (Live)');

export const VersionChoiceWrapper = {
  async reset() {
    providersHost.clear();
    useSoundStore.setState({ src: null, status: 'stopped' });
    useStartupStore.setState({ isStartingUp: false });
    useStreamVerificationStore.setState({ verifications: {} });
    await setSetting('core.playback.streamVerification', true);
    providersHost.register(
      new StreamingProviderBuilder()
        .withSearchForTrack(async () => [STUDIO, LIVE])
        .withGetStreamUrl(async (candidateId) => createMockStream(candidateId))
        .build(),
    );
  },

  queueItem(title: string, candidates?: StreamCandidate[]): QueueItem {
    const item = createQueueItem(title);
    return candidates
      ? { ...item, track: { ...item.track, streamCandidates: candidates } }
      : item;
  },

  async seedDownload(item: QueueItem, streamId?: string) {
    await saveDownloadedTrack(item.track, `${item.id}.m4a`, streamId);
  },

  async remember(item: QueueItem, streamId: string) {
    await useStreamVerificationStore
      .getState()
      .saveVerification(item.track, streamId);
  },

  async play(item: QueueItem) {
    QueueWrapper.initQueue([item]);
    await QueueWrapper.mount();
    await waitFor(() => {
      expect(useSoundStore.getState().src).not.toBeNull();
    });
  },

  get playingUrl() {
    const url = useSoundStore.getState().src!.url;
    const lastSegment = url.slice(url.lastIndexOf('/') + 1);
    if (url.includes('/local/')) {
      return `local:${decodeURIComponent(lastSegment)}`;
    }
    return atob(lastSegment.replace(/-/g, '+').replace(/_/g, '/'));
  },

  get currentItem() {
    return useQueueStore.getState().getCurrentItem();
  },
};
