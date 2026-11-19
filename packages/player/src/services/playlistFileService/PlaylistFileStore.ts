import { BaseDirectory, remove } from '@tauri-apps/plugin-fs';
import { LazyStore } from '@tauri-apps/plugin-store';

import type { Playlist } from '@nuclearplayer/model';
import { playlistSchema } from '@nuclearplayer/model';

import { Logger } from '../logger';
import { loadValidated } from '../validatedStore';

const PLAYLISTS_DIR = 'playlists';

export class PlaylistFileStore {
  #stores = new Map<string, LazyStore>();

  #get(id: string): LazyStore {
    let store = this.#stores.get(id);
    if (!store) {
      store = new LazyStore(`${PLAYLISTS_DIR}/${id}.json`);
      this.#stores.set(id, store);
    }
    return store;
  }

  async load(id: string): Promise<Playlist | null> {
    return loadValidated(
      this.#get(id),
      'playlist',
      playlistSchema,
      'playlists',
    );
  }

  async save(playlist: Playlist): Promise<void> {
    const store = this.#get(playlist.id);
    await store.set('playlist', playlist);
    await store.save();
  }

  async delete(id: string): Promise<void> {
    const store = this.#get(id);
    await store.clear();
    await store.save();
    this.#stores.delete(id);

    try {
      await remove(`${PLAYLISTS_DIR}/${id}.json`, {
        baseDir: BaseDirectory.AppData,
      });
    } catch {
      Logger.playlists.warn(
        `Failed to delete playlist file for id ${id}. It may have already been removed.`,
      );
    }
  }
}
