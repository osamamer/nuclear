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

const trackWithVersion = (track: Track, candidate: StreamCandidate): Track => ({
  ...track,
  streamCandidates: [
    chosenCandidate(candidate),
    ...(track.streamCandidates ?? []).filter(
      (current) => current.id !== candidate.id,
    ),
  ],
});

export const applyVersion = async (
  track: Track,
  candidate: StreamCandidate,
  remember: boolean,
  playlistId?: string,
): Promise<void> => {
  if (remember) {
    await useStreamVerificationStore
      .getState()
      .saveVerification(track, candidate.id);
  }

  const queue = useQueueStore.getState();
  const currentItem = queue.getCurrentItem();
  if (
    currentItem &&
    isSameTrack(currentItem.track, track) &&
    (!playlistId || currentItem.playlistId === playlistId)
  ) {
    queue.updateItemState(currentItem.id, {
      status: 'idle',
      error: undefined,
      track: trackWithVersion(currentItem.track, candidate),
    });
    return;
  }

  const replaced = queue.replaceQueue([track], playlistId, 0, {
    selectedVersion: chosenCandidate(candidate),
  });
  if (replaced) {
    playbackManager.play();
  }
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
