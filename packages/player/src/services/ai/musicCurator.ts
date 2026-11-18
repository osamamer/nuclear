import { z } from 'zod';

import type { Track } from '@nuclearplayer/model';

import type { TasteProfile } from '../discover/tasteProfile';
import { bareTrack, keyOfTrack, normalizeName } from '../discover/trackKeys';
import { metadataHost } from '../metadataHost';
import { providersHost } from '../providersHost';
import { askAiJson } from './aiClient';

const curationSchema = z.object({
  headline: z.string(),
  picks: z.array(
    z.object({
      artist: z.string(),
      title: z.string(),
      reason: z.string(),
    }),
  ),
});

export type AiCuration = z.infer<typeof curationSchema>;

export type CuratedTrack = {
  track: Track;
  reason: string;
};

export type CuratedResult = {
  headline: string;
  tracks: CuratedTrack[];
};

const SYSTEM_PROMPT = `You are the music curator inside Nuclear, a desktop music player.
The listener describes what they want to hear in their own words: a mood, an activity, a half-remembered song, a genre, or "something like X".
Use their taste profile to tailor the picks: lean toward what fits their taste, and avoid songs listed as already known unless they explicitly ask for them.
Suggest 12 real, released songs that exist on streaming platforms. Never invent songs or artists. Mix well-known and lesser-known picks and avoid repeating the same artist more than twice.
If the request names a specific song, put the closest match first and follow with related songs.
For each pick, give a reason of at most 12 words that speaks to the listener directly.
The headline is one short, playful sentence (at most 10 words) introducing the selection.`;

const TASTE_ARTIST_LIMIT = 25;
const KNOWN_TRACK_LIMIT = 40;
const RESOLVE_CONCURRENCY = 4;

const describeTaste = (profile: TasteProfile | undefined): string => {
  if (!profile || profile.artists.length === 0) {
    return 'No listening history yet.';
  }
  const artists = profile.artists
    .slice(0, TASTE_ARTIST_LIMIT)
    .map((artist) => artist.name)
    .join(', ');
  const known = profile.recentTracks
    .slice(0, KNOWN_TRACK_LIMIT)
    .map((track) => `${track.artists[0] ?? ''} - ${track.title}`)
    .join('; ');
  return `Favorite artists (most loved first): ${artists}\nRecently played songs (already known): ${known || 'none'}`;
};

const resolvePick = async (
  pick: AiCuration['picks'][number],
): Promise<Track> => {
  const providerId = providersHost.getActive('metadata');
  if (!providerId) {
    return bareTrack(pick.artist, pick.title);
  }
  try {
    const results = await metadataHost.search(
      { query: `${pick.artist} ${pick.title}`, types: ['tracks'], limit: 5 },
      providerId,
    );
    const wanted = keyOfTrack({
      title: pick.title,
      artists: [{ name: pick.artist, roles: [] }],
    });
    const tracks = results.tracks ?? [];
    const match =
      tracks.find((track) => keyOfTrack(track) === wanted) ??
      tracks.find((track) =>
        track.artists.some(
          (artist) => normalizeName(artist.name) === normalizeName(pick.artist),
        ),
      );
    return match ?? bareTrack(pick.artist, pick.title);
  } catch {
    return bareTrack(pick.artist, pick.title);
  }
};

const resolvePicks = async (
  picks: AiCuration['picks'],
): Promise<CuratedTrack[]> => {
  const resolved: CuratedTrack[] = new Array(picks.length);
  let cursor = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(RESOLVE_CONCURRENCY, picks.length) },
      async () => {
        while (cursor < picks.length) {
          const index = cursor++;
          resolved[index] = {
            track: await resolvePick(picks[index]),
            reason: picks[index].reason,
          };
        }
      },
    ),
  );
  return resolved;
};

export const curateWithAi = async (
  request: string,
  profile: TasteProfile | undefined,
): Promise<CuratedResult> => {
  const curation = await askAiJson({
    system: SYSTEM_PROMPT,
    prompt: `Taste profile:\n${describeTaste(profile)}\n\nRequest: ${request}`,
    schema: curationSchema,
  });
  return {
    headline: curation.headline,
    tracks: await resolvePicks(curation.picks),
  };
};
