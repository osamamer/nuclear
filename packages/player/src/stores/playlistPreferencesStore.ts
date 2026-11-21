import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlaylistTrackSortBy =
  'playlistOrder' | 'dateAddedNewest' | 'dateAddedOldest' | 'reverse';

type PlaylistPreferencesState = {
  trackSortByPlaylist: Record<string, PlaylistTrackSortBy>;
  lastPlayedByPlaylist: Record<string, number>;
  recordPlayed: (playlistId: string) => void;
  setTrackSortBy: (playlistId: string, sortBy: PlaylistTrackSortBy) => void;
};

export const usePlaylistPreferencesStore = create<PlaylistPreferencesState>()(
  persist(
    (set) => ({
      trackSortByPlaylist: {},
      lastPlayedByPlaylist: {},
      recordPlayed: (playlistId) =>
        set((state) => ({
          lastPlayedByPlaylist: {
            ...state.lastPlayedByPlaylist,
            [playlistId]: Date.now(),
          },
        })),
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
