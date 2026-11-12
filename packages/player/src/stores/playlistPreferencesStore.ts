import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlaylistTrackSortBy =
  'playlistOrder' | 'dateAddedNewest' | 'dateAddedOldest' | 'reverse';

type PlaylistPreferencesState = {
  trackSortByPlaylist: Record<string, PlaylistTrackSortBy>;
  setTrackSortBy: (playlistId: string, sortBy: PlaylistTrackSortBy) => void;
};

export const usePlaylistPreferencesStore = create<PlaylistPreferencesState>()(
  persist(
    (set) => ({
      trackSortByPlaylist: {},
      setTrackSortBy: (playlistId, sortBy) =>
        set((state) => ({
          trackSortByPlaylist: {
            ...state.trackSortByPlaylist,
            [playlistId]: sortBy,
          },
        })),
    }),
    { name: 'nuclear-playlist-preferences' },
  ),
);
