import { create } from 'zustand';

import type { Track } from '@nuclearplayer/model';

type VersionPickerState = {
  track: Track | null;
  playlistId?: string;
  open: (track: Track, playlistId?: string) => void;
  close: () => void;
};

export const useVersionPickerStore = create<VersionPickerState>((set) => ({
  track: null,
  open: (track, playlistId) => set({ track, playlistId }),
  close: () => set({ track: null, playlistId: undefined }),
}));
