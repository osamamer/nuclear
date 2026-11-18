import type { Track } from '@nuclearplayer/model';

const DECORATIONS = /\s*[([][^)\]]*[)\]]\s*/g;
const FEATURING = /\s+(feat\.?|ft\.?|featuring)\s+.*$/i;

export const normalizeName = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

export const normalizeTitle = (value: string): string =>
  normalizeName(value.replace(DECORATIONS, ' ').replace(FEATURING, ''));

export const trackKey = (artist: string, title: string): string =>
  `${normalizeName(artist)}::${normalizeTitle(title)}`;

export const keyOfTrack = (track: Pick<Track, 'artists' | 'title'>): string =>
  trackKey(track.artists[0]?.name ?? '', track.title);

export const bareTrack = (
  artist: string,
  title: string,
  artworkUrl?: string | null,
): Track => ({
  title,
  artists: [{ name: artist, roles: [] }],
  artwork: artworkUrl
    ? { items: [{ url: artworkUrl, purpose: 'thumbnail' }] }
    : undefined,
  source: { provider: 'discover', id: trackKey(artist, title) },
});
