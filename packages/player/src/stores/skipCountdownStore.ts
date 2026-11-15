import { create } from 'zustand';

export type SkipCountdown = {
  trackKey: string;
  deadlineMs: number;
  durationMs: number;
};

export const getCountdownRemainingMs = (
  countdown: SkipCountdown,
  now = Date.now(),
): number => Math.max(countdown.deadlineMs - now, 0);

type SkipCountdownState = {
  skip: SkipCountdown | null;
  forward: SkipCountdown | null;
  setSkip: (countdown: SkipCountdown | null) => void;
  setForward: (countdown: SkipCountdown | null) => void;
};

export const useSkipCountdownStore = create<SkipCountdownState>((set) => ({
  skip: null,
  forward: null,
  setSkip: (countdown) => set({ skip: countdown }),
  setForward: (countdown) => set({ forward: countdown }),
}));
