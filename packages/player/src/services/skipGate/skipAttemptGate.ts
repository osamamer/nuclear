import {
  getCountdownRemainingMs,
  useSkipCountdownStore,
} from '../../stores/skipCountdownStore';
import { rewindGate } from './rewindGate';

export const SKIP_COUNTDOWN_MS = 5_000;
export const FREE_SKIP_FRACTION = 0.7;
export const LONG_TRACK_MS = 10 * 60_000;
export const LONG_TRACK_FREE_SKIP_MS = 7 * 60_000;

let engagedTrackKey: string | null = null;
let pausedAtMs: number | null = null;
let unlocked = false;

const getCountdown = () => useSkipCountdownStore.getState().skip;
const setCountdown = (countdown: ReturnType<typeof getCountdown>): void =>
  useSkipCountdownStore.getState().setSkip(countdown);

const isPlayedEnoughToSkip = (
  positionMs: number,
  durationMs: number,
): boolean => {
  if (
    !Number.isFinite(positionMs) ||
    !Number.isFinite(durationMs) ||
    positionMs <= 0 ||
    durationMs <= 0
  ) {
    return false;
  }
  const playedMs = rewindGate.naturalPositionMs(positionMs);
  if (playedMs > durationMs * FREE_SKIP_FRACTION) {
    return true;
  }
  return durationMs > LONG_TRACK_MS && playedMs > LONG_TRACK_FREE_SKIP_MS;
};

export const skipAttemptGate = {
  onTrackPlaying(trackKey: string): void {
    if (!trackKey) {
      return;
    }
    if (engagedTrackKey !== trackKey) {
      engagedTrackKey = trackKey;
      setCountdown(null);
      unlocked = false;
    } else if (
      pausedAtMs !== null &&
      Date.now() - pausedAtMs >= SKIP_COUNTDOWN_MS
    ) {
      unlocked = true;
    }
    pausedAtMs = null;
  },

  onTrackPaused(trackKey: string): void {
    if (!trackKey || engagedTrackKey !== trackKey) {
      return;
    }
    if (pausedAtMs === null) {
      pausedAtMs = Date.now();
    }
  },

  onCurrentTrackChanged(trackKey: string | null): void {
    if (trackKey !== engagedTrackKey) {
      skipAttemptGate.release();
    }
  },

  release(): void {
    engagedTrackKey = null;
    pausedAtMs = null;
    unlocked = false;
    setCountdown(null);
  },

  shouldRefuse(
    currentTrackKey: string,
    positionMs: number,
    durationMs: number,
  ): boolean {
    if (
      !currentTrackKey ||
      engagedTrackKey === null ||
      engagedTrackKey !== currentTrackKey
    ) {
      return false;
    }
    if (unlocked) {
      return false;
    }
    if (isPlayedEnoughToSkip(positionMs, durationMs)) {
      setCountdown(null);
      return false;
    }

    const now = Date.now();
    if (pausedAtMs !== null) {
      const pauseDeadlineMs = pausedAtMs + SKIP_COUNTDOWN_MS;
      if (now >= pauseDeadlineMs) {
        unlocked = true;
        setCountdown(null);
        return false;
      }
      const existing = getCountdown();
      const existingDeadlineMs =
        existing?.trackKey === currentTrackKey ? existing.deadlineMs : null;
      setCountdown({
        trackKey: currentTrackKey,
        deadlineMs:
          existingDeadlineMs === null
            ? pauseDeadlineMs
            : Math.min(existingDeadlineMs, pauseDeadlineMs),
        durationMs: SKIP_COUNTDOWN_MS,
      });
      return true;
    }

    const existing = getCountdown();
    if (!existing || existing.trackKey !== currentTrackKey) {
      setCountdown({
        trackKey: currentTrackKey,
        deadlineMs: now + SKIP_COUNTDOWN_MS,
        durationMs: SKIP_COUNTDOWN_MS,
      });
      return true;
    }
    if (getCountdownRemainingMs(existing, now) > 0) {
      return true;
    }

    engagedTrackKey = null;
    setCountdown(null);
    return false;
  },
};
