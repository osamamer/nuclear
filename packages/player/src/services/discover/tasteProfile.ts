import shuffle from 'lodash-es/shuffle';
import { DateTime } from 'luxon';

import type { Track } from '@nuclearplayer/model';

import { useFavoritesStore } from '../../stores/favoritesStore';
import { PlaylistIndexTree } from '../../stores/PlaylistIndexTree';
import { usePlaylistStore } from '../../stores/playlistStore';
import type { TopArtist, TopTrack } from '../tauri/bindings';
import { commands } from '../tauri/bindings';
import { unwrapResult } from '../tauri/results';
import { bareTrack, keyOfTrack, normalizeName, trackKey } from './trackKeys';

export type TasteSource = 'history' | 'playlists' | 'favorites';

export type TasteArtist = {
  name: string;
  weight: number;
  imageUrl?: string;
  sources: TasteSource[];
};

export type TasteProfile = {
  artists: TasteArtist[];
  knownArtistKeys: Set<string>;
  knownTrackKeys: Set<string>;
  libraryTracks: Track[];
  recentTracks: TopTrack[];
  forgottenFavorites: Track[];
};

const RECENT_ARTIST_DAYS = 90;
const RECENT_TRACK_DAYS = 60;
const FORGOTTEN_MIN_PLAYS = 3;
const FORGOTTEN_LIMIT = 12;

const safely = async <T>(load: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await load();
  } catch {
    return fallback;
  }
};

const rangeFromDaysAgo = (days: number) => ({
  from: DateTime.now().minus({ days }).toMillis(),
  to: DateTime.now().toMillis(),
});

const allTimeRange = () => ({ from: 0, to: DateTime.now().toMillis() });

const loadLibraryTracks = async (): Promise<Track[]> => {
  const { index, loadPlaylist } = usePlaylistStore.getState();
  const entries = new PlaylistIndexTree(index).playlists();
  const playlists = await Promise.all(
    entries.map((entry) => safely(() => loadPlaylist(entry.id), null)),
  );
  return playlists.flatMap(
    (playlist) => playlist?.items.map((item) => item.track) ?? [],
  );
};

class ArtistWeights {
  private readonly entries = new Map<string, TasteArtist>();

  add(
    name: string,
    weight: number,
    source: TasteSource,
    imageUrl?: string | null,
  ) {
    const key = normalizeName(name);
    if (!key) {
      return;
    }
    const existing = this.entries.get(key) ?? {
      name,
      weight: 0,
      sources: [],
    };
    existing.weight += weight;
    if (!existing.sources.includes(source)) {
      existing.sources.push(source);
    }
    if (!existing.imageUrl && imageUrl) {
      existing.imageUrl = imageUrl;
    }
    this.entries.set(key, existing);
  }

  sorted(): TasteArtist[] {
    return [...this.entries.values()].sort(
      (first, second) => second.weight - first.weight,
    );
  }
}

const addPlayedArtists = (
  weights: ArtistWeights,
  artists: TopArtist[],
  scale: number,
) => {
  const maxPlayed = Math.max(1, ...artists.map((artist) => artist.msPlayed));
  artists.forEach((artist) =>
    weights.add(
      artist.name,
      (artist.msPlayed / maxPlayed) * scale,
      'history',
      artist.artworkUrl,
    ),
  );
};

const countArtists = (tracks: Track[]) => {
  const counts = new Map<string, { name: string; count: number }>();
  tracks.forEach((track) =>
    track.artists.forEach((artist) => {
      const key = normalizeName(artist.name);
      const current = counts.get(key) ?? { name: artist.name, count: 0 };
      current.count += 1;
      counts.set(key, current);
    }),
  );
  return [...counts.values()];
};

const findForgottenFavorites = (
  allTime: TopTrack[],
  recent: TopTrack[],
  library: Map<string, Track>,
): Track[] => {
  const recentKeys = new Set(
    recent.map((track) => trackKey(track.artists[0] ?? '', track.title)),
  );
  const forgotten = allTime
    .filter((track) => track.plays >= FORGOTTEN_MIN_PLAYS)
    .filter(
      (track) => !recentKeys.has(trackKey(track.artists[0] ?? '', track.title)),
    )
    .map((track) => {
      const key = trackKey(track.artists[0] ?? '', track.title);
      return (
        library.get(key) ??
        bareTrack(track.artists[0] ?? '', track.title, track.artworkUrl)
      );
    });
  return shuffle(forgotten).slice(0, FORGOTTEN_LIMIT);
};

export const buildTasteProfile = async (): Promise<TasteProfile> => {
  const [libraryTracks, recentArtists, allTimeArtists, recentTracks, allTime] =
    await Promise.all([
      loadLibraryTracks(),
      safely(
        async () =>
          unwrapResult(
            await commands.historyTopArtists(
              rangeFromDaysAgo(RECENT_ARTIST_DAYS),
              30,
            ),
          ),
        [],
      ),
      safely(
        async () =>
          unwrapResult(await commands.historyTopArtists(allTimeRange(), 50)),
        [],
      ),
      safely(
        async () =>
          unwrapResult(
            await commands.historyTopTracks(
              rangeFromDaysAgo(RECENT_TRACK_DAYS),
              200,
            ),
          ),
        [],
      ),
      safely(
        async () =>
          unwrapResult(await commands.historyTopTracks(allTimeRange(), 150)),
        [],
      ),
    ]);

  const { tracks: favoriteTracks, artists: favoriteArtists } =
    useFavoritesStore.getState();
  const favoriteTrackList = favoriteTracks.map((entry) => entry.ref);
  const allLibraryTracks = [...libraryTracks, ...favoriteTrackList];

  const weights = new ArtistWeights();
  addPlayedArtists(weights, recentArtists, 3);
  addPlayedArtists(weights, allTimeArtists, 1.5);

  const playlistCounts = countArtists(libraryTracks);
  const maxCount = Math.max(1, ...playlistCounts.map((entry) => entry.count));
  playlistCounts.forEach((entry) =>
    weights.add(
      entry.name,
      (Math.log2(1 + entry.count) / Math.log2(1 + maxCount)) * 2,
      'playlists',
    ),
  );
  favoriteArtists.forEach((entry) =>
    weights.add(entry.ref.name, 2, 'favorites'),
  );
  countArtists(favoriteTrackList).forEach((entry) =>
    weights.add(entry.name, Math.min(1.5, entry.count * 0.5), 'favorites'),
  );

  const artists = weights.sorted();
  const knownTrackKeys = new Set([
    ...allLibraryTracks.map(keyOfTrack),
    ...allTime.map((track) => trackKey(track.artists[0] ?? '', track.title)),
    ...recentTracks.map((track) =>
      trackKey(track.artists[0] ?? '', track.title),
    ),
  ]);
  const libraryByKey = new Map(
    allLibraryTracks.map((track) => [keyOfTrack(track), track]),
  );

  return {
    artists,
    knownArtistKeys: new Set(
      artists.map((artist) => normalizeName(artist.name)),
    ),
    knownTrackKeys,
    libraryTracks: allLibraryTracks,
    recentTracks,
    forgottenFavorites: findForgottenFavorites(
      allTime,
      recentTracks,
      libraryByKey,
    ),
  };
};
