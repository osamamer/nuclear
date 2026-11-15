import {
  SkipFeedback,
  useSkipFeedbackStore,
} from '../../stores/skipFeedbackStore';
import { playSkipRefusalSound } from '../skipRefusalSound';
import { RewindDecision, rewindGate } from './rewindGate';
import { skipAttemptGate } from './skipAttemptGate';

export { rewindGate } from './rewindGate';
export { skipAttemptGate } from './skipAttemptGate';

export const refuseWithFeedback = (feedback: SkipFeedback): void => {
  playSkipRefusalSound();
  useSkipFeedbackStore.getState().report(feedback);
};

export const isTrackChangeRefused = (
  currentTrackKey: string | undefined,
  positionMs: number,
  durationMs: number,
): boolean => {
  if (
    !currentTrackKey ||
    !skipAttemptGate.shouldRefuse(currentTrackKey, positionMs, durationMs)
  ) {
    return false;
  }
  refuseWithFeedback({ kind: 'skipRefused' });
  return true;
};

const reportRewindDecision = (decision: RewindDecision): boolean => {
  const report = useSkipFeedbackStore.getState().report;
  switch (decision.kind) {
    case 'rewindRefused':
      refuseWithFeedback({ kind: 'rewindRefused' });
      return false;
    case 'forwardWaiting':
      refuseWithFeedback({
        kind: 'forwardWaiting',
        remainingSeconds: Math.ceil(decision.remainingMs / 1000),
      });
      return false;
    case 'forwardRefused':
      refuseWithFeedback({ kind: 'forwardRefused' });
      return false;
    case 'allowedUsedForward':
      report({ kind: 'forwardUsed' });
      return true;
    case 'allowedUsedRewind':
      if (decision.remaining === 0) {
        report({ kind: 'rewindUsed' });
      }
      return true;
    case 'allowed':
      return true;
  }
};

export const isSeekAllowed = (
  currentPositionMs: number,
  targetPositionMs: number,
): boolean =>
  reportRewindDecision(rewindGate.check(currentPositionMs, targetPositionMs));

export const resetSkipGates = (): void => {
  skipAttemptGate.release();
  rewindGate.reset();
};
