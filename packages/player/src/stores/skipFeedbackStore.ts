import { create } from 'zustand';

type SkipFeedbackState = {
  sequence: number;
  hasOneMoreRefusal: boolean;
  refuseSkip: (hasOneMoreRefusal: boolean) => void;
};

export const useSkipFeedbackStore = create<SkipFeedbackState>((set) => ({
  sequence: 0,
  hasOneMoreRefusal: true,
  refuseSkip: (hasOneMoreRefusal) =>
    set((state) => ({
      sequence: state.sequence + 1,
      hasOneMoreRefusal,
    })),
}));
