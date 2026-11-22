import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT_SEARCHES = 5;

type RecentSearchesState = {
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
};

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(
              (item) => item.toLowerCase() !== query.toLowerCase(),
            ),
          ].slice(0, MAX_RECENT_SEARCHES),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'nuclear-recent-searches',
      partialize: ({ recentSearches }) => ({ recentSearches }),
    },
  ),
);
