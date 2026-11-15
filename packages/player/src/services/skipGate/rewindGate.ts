import { useSkipCountdownStore } from '../../stores/skipCountdownStore';

export const REWINDS_PER_TRACK = 1;
export const FORWARDS_PER_TRACK = 1;
export const FORWARD_WAIT_MS = 10_000;
const JITTER_TOLERANCE_MS = 1_500;

export type RewindDecision =
  | { kind: 'allowed' }
  | { kind: 'allowedUsedRewind'; remaining: number }
  | { kind: 'allowedUsedForward' }
  | { kind: 'rewindRefused' }
  | { kind: 'forwardFirstRefused' }
  | { kind: 'forwardWaiting'; remainingMs: number }
  | { kind: 'forwardRefused' };

let trackKey: string | null = null;
let rewindsUsed = 0;
let forwardsUsed = 0;
let forwardUnlockAtMs: number | null = null;
let forwardFirstRefused = false;
let forwardSkippedMs = 0;

const resetBudgets = (): void => {
  rewindsUsed = 0;
  forwardsUsed = 0;
  forwardUnlockAtMs = null;
  forwardFirstRefused = false;
  forwardSkippedMs = 0;
  useSkipCountdownStore.getState().setForward(null);
};

const showForwardCountdown = (deadlineMs: number): void => {
  useSkipCountdownStore.getState().setForward({
    trackKey: trackKey ?? '',
    deadlineMs,
    durationMs: FORWARD_WAIT_MS,
  });
};

const checkForward = (deltaMs: number): RewindDecision => {
  if (forwardsUsed >= FORWARDS_PER_TRACK) {
    return { kind: 'forwardRefused' };
  }

  const now = Date.now();
  if (forwardUnlockAtMs === null) {
    if (!forwardFirstRefused) {
      forwardFirstRefused = true;
      return { kind: 'forwardFirstRefused' };
    }
    forwardUnlockAtMs = now + FORWARD_WAIT_MS;
    showForwardCountdown(forwardUnlockAtMs);
    return { kind: 'forwardWaiting', remainingMs: FORWARD_WAIT_MS };
  }

  if (now < forwardUnlockAtMs) {
    showForwardCountdown(forwardUnlockAtMs);
    return { kind: 'forwardWaiting', remainingMs: forwardUnlockAtMs - now };
  }

  forwardsUsed += 1;
  forwardSkippedMs += deltaMs;
  useSkipCountdownStore.getState().setForward(null);
  return { kind: 'allowedUsedForward' };
};

export const rewindGate = {
  onCurrentTrackChanged(newTrackKey: string | null): void {
    if (newTrackKey === trackKey) {
      return;
    }
    trackKey = newTrackKey;
    resetBudgets();
  },

  restartTrack(): void {
    resetBudgets();
  },

  check(currentPositionMs: number, targetPositionMs: number): RewindDecision {
    const deltaMs = targetPositionMs - currentPositionMs;
    if (!Number.isFinite(deltaMs)) {
      return { kind: 'allowed' };
    }
    if (deltaMs > JITTER_TOLERANCE_MS) {
      return checkForward(deltaMs);
    }
    if (deltaMs >= -JITTER_TOLERANCE_MS) {
      return { kind: 'allowed' };
    }

    if (rewindsUsed >= REWINDS_PER_TRACK) {
      return { kind: 'rewindRefused' };
    }
    rewindsUsed += 1;
    return {
      kind: 'allowedUsedRewind',
      remaining: REWINDS_PER_TRACK - rewindsUsed,
    };
  },

  naturalPositionMs(currentPositionMs: number): number {
    return Math.max(currentPositionMs - forwardSkippedMs, 0);
  },

  reset(): void {
    trackKey = null;
    resetBudgets();
  },
};
