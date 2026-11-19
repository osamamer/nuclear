import omit from 'lodash-es/omit';

import type { StreamCandidate, Track } from '@nuclearplayer/model';
import { stripResolutionState } from '@nuclearplayer/model';

import { useQueueStore } from '../../stores/queueStore';
import { useStreamVerificationStore } from '../../stores/streamVerificationStore';
import { keyOfTrack } from '../discover/trackKeys';
import { playbackManager } from '../playback';
import { hasFreshStream, streamingHost } from '../streamingHost';

export const VERSION_VARIANTS = [
  'original',
  'live',
  'acoustic',
  'remix',
  'cover',
  'instrumental',
  'remastered',
] as const;

export type VersionVariant = (typeof VERSION_VARIANTS)[number];

const searchTrackFor = (track: Track, variant: VersionVariant): Track =>
  variant === 'original'
    ? stripResolutionState(track)
    : { ...stripResolutionState(track), title: `${track.title} ${variant}` };

export const findVersions = async (
  track: Track,
  variant: VersionVariant,
): Promise<StreamCandidate[]> => {
  const result = await streamingHost.resolveCandidatesForTrack(
    searchTrackFor(track, variant),
  );
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.candidates;
};

const isSameTrack = (first: Track, second: Track) =>
  (first.source.provider === second.source.provider &&
    first.source.id === second.source.id) ||
  keyOfTrack(first) === keyOfTrack(second);

const chosenCandidate = (candidate: StreamCandidate): StreamCandidate => ({
  ...(hasFreshStream(candidate)
    ? candidate
    : omit(candidate, ['stream', 'lastResolvedAtIso'])),
  failed: false,
  userSelected: true,
});

const promoteCandidate = (itemId: string, candidate: StreamCandidate) => {
  const queue = useQueueStore.getState();
  const item = queue.getItemById(itemId);
  if (!item) {
    return;
  }
  const others = (item.track.streamCandidates ?? []).filter(
    (current) => current.id !== candidate.id,
  );
  queue.updateItemState(itemId, {
    status: 'idle',
    error: undefined,
    track: {
      ...item.track,
      streamCandidates: [chosenCandidate(candidate), ...others],
    },
  });
};

export const applyVersion = async (
  track: Track,
  candidate: StreamCandidate,
  remember: boolean,
): Promise<void> => {
  if (remember) {
    await useStreamVerificationStore
      .getState()
      .saveVerification(track, candidate.id);
  }

  const currentItem = useQueueStore.getState().getCurrentItem();
  if (currentItem && isSameTrack(currentItem.track, track)) {
    promoteCandidate(currentItem.id, candidate);
    return;
  }

  const replaced = useQueueStore.getState().replaceQueue([track]);
  const newItem = useQueueStore.getState().getCurrentItem();
  if (!replaced || !newItem) {
    return;
  }
  promoteCandidate(newItem.id, candidate);
  playbackManager.play();
};

export const resolveVersionPreview = async (
  candidate: StreamCandidate,
): Promise<StreamCandidate> => {
  const resolved = await streamingHost.resolveStreamForCandidate(candidate);
  if (!resolved || resolved.failed || !resolved.stream) {
    throw new Error('Could not load this version');
  }
  return resolved;
};
