import { useMemo, useState } from 'react';

import type {
  PlaylistFolder,
  PlaylistIndexEntry,
  PlaylistIndexNode,
} from '@nuclearplayer/model';

import { usePlaylistPreferencesStore } from '../../../stores/playlistPreferencesStore';

export type PlaylistSortBy =
  | 'custom'
  | 'recentlyPlayed'
  | 'name'
  | 'dateAdded'
  | 'dateModified'
  | 'trackCount'
  | 'duration';

export type SortDirection = 'asc' | 'desc';

const comparePlaylists = (
  left: PlaylistIndexEntry,
  right: PlaylistIndexEntry,
  sortBy: Exclude<PlaylistSortBy, 'custom' | 'recentlyPlayed'>,
): number => {
  switch (sortBy) {
    case 'name':
      return left.name.localeCompare(right.name);
    case 'dateAdded':
      return left.createdAtIso.localeCompare(right.createdAtIso);
    case 'dateModified':
      return left.lastModifiedIso.localeCompare(right.lastModifiedIso);
    case 'trackCount':
      return left.itemCount - right.itemCount;
    case 'duration':
      return left.totalDurationMs - right.totalDurationMs;
  }
};

const sortInDirection = <Entry extends PlaylistIndexNode>(
  entries: Entry[],
  compare: (left: Entry, right: Entry) => number,
  sortDirection: SortDirection,
): Entry[] => {
  const ascending = [...entries].sort(compare);

  if (sortDirection === 'desc') {
    return ascending.reverse();
  }

  return ascending;
};

const compareNames = (left: PlaylistFolder, right: PlaylistFolder) =>
  left.name.localeCompare(right.name);

export const usePlaylistSort = (entries: PlaylistIndexNode[]) => {
  const [selectedSortBy, setSortBy] = useState<PlaylistSortBy>();
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const lastPlayed = usePlaylistPreferencesStore(
    (state) => state.lastPlayedByPlaylist,
  );
  const sortBy =
    selectedSortBy ??
    (entries.some(
      (entry) =>
        entry.kind === 'playlist' && lastPlayed[entry.id] !== undefined,
    )
      ? 'recentlyPlayed'
      : 'custom');

  const selectSortBy = (nextSortBy: PlaylistSortBy) => {
    setSortBy(nextSortBy);
    if (nextSortBy === 'custom') {
      setSortDirection('asc');
    }
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => {
      if (current === 'asc') {
        return 'desc';
      }
      return 'asc';
    });
  };

  const sortedEntries = useMemo((): PlaylistIndexNode[] => {
    if (sortBy === 'custom') {
      return entries;
    }

    const folders = entries.filter((entry) => entry.kind === 'folder');
    const playlists = entries.filter((entry) => entry.kind === 'playlist');
    if (sortBy === 'recentlyPlayed') {
      playlists.sort(
        (left, right) =>
          (lastPlayed[right.id] ?? 0) - (lastPlayed[left.id] ?? 0),
      );
      let playlistIndex = 0;
      return entries.map((entry) =>
        entry.kind === 'folder' ? entry : playlists[playlistIndex++],
      );
    }

    return [
      ...sortInDirection(folders, compareNames, sortDirection),
      ...sortInDirection(
        playlists,
        (left, right) => comparePlaylists(left, right, sortBy),
        sortDirection,
      ),
    ];
  }, [entries, sortBy, sortDirection, lastPlayed]);

  return {
    sortBy,
    setSortBy: selectSortBy,
    sortDirection,
    toggleSortDirection,
    sortedEntries,
  };
};
