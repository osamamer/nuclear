import { create } from 'zustand';

export type SkipFeedback =
  | { kind: 'skipRefused' }
  | { kind: 'rewindRefused' }
  | { kind: 'rewindUsed' }
  | { kind: 'forwardWaiting'; remainingSeconds: number }
  | { kind: 'forwardRefused' }
  | { kind: 'forwardUsed' }
  | { kind: 'blacklisted' };

type SkipFeedbackState = {
  sequence: number;
  feedback: SkipFeedback | null;
  report: (feedback: SkipFeedback) => void;
  reportBlacklistedTracks: () => void;
};

export const useSkipFeedbackStore = create<SkipFeedbackState>((set) => ({
  sequence: 0,
  feedback: null,
  report: (feedback) =>
    set((state) => ({ sequence: state.sequence + 1, feedback })),
  reportBlacklistedTracks: () =>
    set((state) => ({
      sequence: state.sequence + 1,
      feedback: { kind: 'blacklisted' },
    })),
}));
