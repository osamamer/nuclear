import { create } from 'zustand';

import type { CuratedResult } from '../services/ai/musicCurator';
import type { DiscoverMode } from '../services/discover/discoverEngine';

type DiscoverState = {
  mode: DiscoverMode;
  seeds: string[];
  shuffleCount: number;
  aiRequest: string;
  aiResult: CuratedResult | null;
  pendingAiRequest: string | null;
  setMode: (mode: DiscoverMode) => void;
  setSeeds: (seeds: string[]) => void;
  reshuffle: () => void;
  setAiRequest: (request: string) => void;
  setAiResult: (result: CuratedResult | null) => void;
  queueAiRequest: (request: string) => void;
  takePendingAiRequest: () => string | null;
};

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  mode: 'balanced',
  seeds: [],
  shuffleCount: 0,
  aiRequest: '',
  aiResult: null,
  pendingAiRequest: null,
  setMode: (mode) => set({ mode }),
  setSeeds: (seeds) => set({ seeds }),
  reshuffle: () => set((state) => ({ shuffleCount: state.shuffleCount + 1 })),
  setAiRequest: (aiRequest) => set({ aiRequest }),
  setAiResult: (aiResult) => set({ aiResult }),
  queueAiRequest: (request) =>
    set({ aiRequest: request, pendingAiRequest: request }),
  takePendingAiRequest: () => {
    const pending = get().pendingAiRequest;
    set({ pendingAiRequest: null });
    return pending;
  },
}));
