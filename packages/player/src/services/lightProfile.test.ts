import { describe, expect, it } from 'vitest';

import type { Playlist } from '@nuclearplayer/model';

import { usePlaylistStore } from '../stores/playlistStore';
import { createMockTrack } from '../test/utils/mockTrack';
import { parseLightProfilePlaylists, showOnlyPlaylists } from './lightProfile';

const playlist = (id: string, name: string): Playlist => ({
  id,
  name,
  createdAtIso: '2026-01-01T00:00:00.000Z',
  lastModifiedIso: '2026-01-01T00:00:00.000Z',
  isReadOnly: false,
  items: [
    {
      id: `${id}-item`,
      track: createMockTrack('Gentle song'),
      addedAtIso: '2026-01-01T00:00:00.000Z',
    },
  ],
});

describe('light profile playlists', () => {
  it('are read only and invalid entries are dropped', () => {
    const parsed = parseLightProfilePlaylists([
      JSON.stringify(playlist('calm', 'Calm')),
      JSON.stringify({ name: 'broken' }),
    ]);

    expect(parsed.map((entry) => [entry.id, entry.isReadOnly])).toEqual([
      ['calm', true],
    ]);
  });

  it('are the only playlists the store offers', () => {
    showOnlyPlaylists([playlist('calm', 'Calm'), playlist('rain', 'Rain')]);

    const state = usePlaylistStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.index.map((entry) => entry.name)).toEqual(['Calm', 'Rain']);
    expect([...state.playlists.keys()]).toEqual(['calm', 'rain']);
  });
});
