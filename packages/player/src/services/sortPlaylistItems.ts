import type { PlaylistItem } from '@nuclearplayer/model';

import type { PlaylistTrackSortBy } from '../stores/playlistPreferencesStore';

export const sortPlaylistItems = (
  items: PlaylistItem[],
  sortBy: PlaylistTrackSortBy,
): PlaylistItem[] => {
  if (sortBy === 'reverse') {
    return [...items].reverse();
  }

  if (sortBy === 'dateAddedNewest') {
    return [...items].sort((left, right) =>
      right.addedAtIso.localeCompare(left.addedAtIso),
    );
  }

  if (sortBy === 'dateAddedOldest') {
    return [...items].sort((left, right) =>
      left.addedAtIso.localeCompare(right.addedAtIso),
    );
  }

  return items;
};
