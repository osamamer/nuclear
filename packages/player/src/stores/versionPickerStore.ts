import { create } from 'zustand';

import type { Track } from '@nuclearplayer/model';

type VersionPickerState = {
  track: Track | null;
  open: (track: Track) => void;
  close: () => void;
};

export const useVersionPickerStore = create<VersionPickerState>((set) => ({
  track: null,
  open: (track) => set({ track }),
  close: () => set({ track: null }),
}));
