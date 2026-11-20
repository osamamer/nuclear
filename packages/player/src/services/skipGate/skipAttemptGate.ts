import {
  getCountdownRemainingMs,
  useSkipCountdownStore,
} from '../../stores/skipCountdownStore';
import { rewindGate } from './rewindGate';

export const SKIP_COUNTDOWN_MS = 10_000;
export const FREE_SKIP_INTRO_MS = 10_000;
export const FREE_SKIP_FRACTION = 0.7;
export const LONG_TRACK_MS = 10 * 60_000;
export const LONG_TRACK_FREE_SKIP_MS = 7 * 60_000;

let engagedTrackKey: string | null = null;
let pausedAtMs: number | null = null;
let unlocked = false;
let firstAttemptRefused = false;
let playingSinceMs: number | null = null;
let accumulatedPlayMs = 0;

const playedTimeMs = (now: number): number =>
  accumulatedPlayMs + (playingSinceMs === null ? 0 : now - playingSinceMs);

const isWithinFreeIntro = (positionMs: number, now: number): boolean =>
  Number.isFinite(positionMs) &&
  positionMs < FREE_SKIP_INTRO_MS &&
  playedTimeMs(now) < FREE_SKIP_INTRO_MS;

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
    const now = Date.now();
    if (engagedTrackKey !== trackKey) {
      engagedTrackKey = trackKey;
      setCountdown(null);
      unlocked = false;
      firstAttemptRefused = false;
      accumulatedPlayMs = 0;
      playingSinceMs = now;
    } else if (pausedAtMs !== null && now - pausedAtMs >= SKIP_COUNTDOWN_MS) {
      unlocked = true;
    }
    if (playingSinceMs === null) {
      playingSinceMs = now;
    }
    pausedAtMs = null;
  },

  onTrackPaused(trackKey: string): void {
    if (!trackKey || engagedTrackKey !== trackKey) {
      return;
    }
    const now = Date.now();
    if (pausedAtMs === null) {
      pausedAtMs = now;
    }
    if (playingSinceMs !== null) {
      accumulatedPlayMs += now - playingSinceMs;
      playingSinceMs = null;
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
    firstAttemptRefused = false;
    playingSinceMs = null;
    accumulatedPlayMs = 0;
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
    const now = Date.now();
    if (isWithinFreeIntro(positionMs, now)) {
      return false;
    }
    if (isPlayedEnoughToSkip(positionMs, durationMs)) {
      setCountdown(null);
      return false;
    }

    if (pausedAtMs !== null) {
      const pauseDeadlineMs = pausedAtMs + SKIP_COUNTDOWN_MS;
      if (now >= pauseDeadlineMs) {
        unlocked = true;
        setCountdown(null);
        return false;
      }
      if (!firstAttemptRefused) {
        firstAttemptRefused = true;
        return true;
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
      if (!firstAttemptRefused) {
        firstAttemptRefused = true;
        return true;
      }
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
    firstAttemptRefused = false;
    setCountdown(null);
    return false;
  },
};
