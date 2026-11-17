import type { Playlist } from '@nuclearplayer/model';
import { playlistSchema } from '@nuclearplayer/model';

import { useLightProfileStore } from '../stores/lightProfileStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { Logger } from './logger';
import { toIndexEntry } from './playlistFileService';
import { commands } from './tauri/bindings';

export const parseLightProfilePlaylists = (
  playlistsJson: string[],
): Playlist[] =>
  playlistsJson.flatMap((json) => {
    const parsed = playlistSchema.safeParse(JSON.parse(json));
    return parsed.success ? [{ ...parsed.data, isReadOnly: true }] : [];
  });

export const showOnlyPlaylists = (playlists: Playlist[]) => {
  usePlaylistStore.setState({
    index: playlists.map(toIndexEntry),
    playlists: new Map(playlists.map((playlist) => [playlist.id, playlist])),
    loaded: true,
  });
};

export const initializeLightProfile = async (): Promise<Playlist[] | null> => {
  try {
    const result = await commands.lightProfileActive();
    if (result.status === 'error') {
      Logger.app.error(`Failed to load light profile: ${result.error}`);
      return null;
    }
    if (!result.data) {
      return null;
    }
    useLightProfileStore.setState({ name: result.data.name });
    return parseLightProfilePlaylists(result.data.playlistsJson);
  } catch (error) {
    Logger.app.error(`Failed to load light profile: ${String(error)}`);
    return null;
  }
};
