import type { ArtistRef, Track, TrackRef } from '@nuclearplayer/model';
import type {
  DiscoveryProvider,
  MetadataProvider,
} from '@nuclearplayer/plugin-sdk';

import { trackRefToTrack } from '../../utils/trackRefToTrack';
import { discoveryHost } from '../discoveryHost';
import { metadataHost } from '../metadataHost';
import { providersHost } from '../providersHost';
import type { TasteArtist, TasteProfile } from './tasteProfile';
import { keyOfTrack, normalizeName } from './trackKeys';

export type DiscoverMode = 'familiar' | 'balanced' | 'adventurous';

export type DiscoverPick = {
  track: Track;
  because: string[];
};

export type DiscoverArtist = {
  artist: ArtistRef;
  providerId: string;
  because: string[];
};

export type DiscoverSource = 'related' | 'discoveryProvider' | 'none';

export type DiscoverResult = {
  picks: DiscoverPick[];
  artists: DiscoverArtist[];
  source: DiscoverSource;
};

export type DiscoverOptions = {
  profile: TasteProfile;
  mode: DiscoverMode;
  seeds?: string[];
  random?: () => number;
};

type ModeTuning = {
  seedCount: number;
  seedExponent: number;
  knownArtistFactor: number;
  tracksPerArtist: number;
  topTrackDepth: number;
  variety: number;
};

const MODE_TUNING: Record<DiscoverMode, ModeTuning> = {
  familiar: {
    seedCount: 4,
    seedExponent: 2,
    knownArtistFactor: 0.8,
    tracksPerArtist: 2,
    topTrackDepth: 4,
    variety: 0.2,
  },
  balanced: {
    seedCount: 5,
    seedExponent: 1,
    knownArtistFactor: 0.25,
    tracksPerArtist: 2,
    topTrackDepth: 6,
    variety: 0.5,
  },
  adventurous: {
    seedCount: 6,
    seedExponent: 0.5,
    knownArtistFactor: 0,
    tracksPerArtist: 1,
    topTrackDepth: 10,
    variety: 0.85,
  },
};

const SEED_POOL_SIZE = 24;
const RELATED_PER_SEED = 12;
const CANDIDATE_ARTISTS = 14;
const MAX_PICKS = 24;
const CONCURRENCY = 4;

const mapWithConcurrency = async <TInput, TOutput>(
  inputs: TInput[],
  worker: (input: TInput) => Promise<TOutput>,
): Promise<TOutput[]> => {
  const results: TOutput[] = new Array(inputs.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(CONCURRENCY, inputs.length) },
    async () => {
      while (cursor < inputs.length) {
        const index = cursor++;
        results[index] = await worker(inputs[index]);
      }
    },
  );
  await Promise.all(runners);
  return results;
};

const weightedSample = <T>(
  items: T[],
  weightOf: (item: T) => number,
  count: number,
  random: () => number,
): T[] => {
  const pool = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + weightOf(item), 0);
    let threshold = random() * total;
    const index = pool.findIndex((item) => {
      threshold -= weightOf(item);
      return threshold <= 0;
    });
    const pickedIndex = index === -1 ? pool.length - 1 : index;
    chosen.push(pool[pickedIndex]);
    pool.splice(pickedIndex, 1);
  }
  return chosen;
};

const activeMetadataProvider = (): MetadataProvider | undefined =>
  providersHost.get<MetadataProvider>(
    providersHost.getActive('metadata'),
    'metadata',
  );

const supportsRelatedDiscovery = (provider: MetadataProvider | undefined) =>
  Boolean(
    provider?.artistMetadataCapabilities?.includes('artistRelatedArtists') &&
    provider.artistMetadataCapabilities.includes('artistTopTracks'),
  );

const resolveArtist = async (
  name: string,
  providerId: string,
): Promise<ArtistRef | undefined> => {
  try {
    const results = await metadataHost.search(
      { query: name, types: ['artists'], limit: 5 },
      providerId,
    );
    const artists = results.artists ?? [];
    return (
      artists.find(
        (artist) => normalizeName(artist.name) === normalizeName(name),
      ) ?? artists[0]
    );
  } catch {
    return undefined;
  }
};

const fetchRelated = async (
  seed: TasteArtist,
  providerId: string,
): Promise<{ seed: TasteArtist; related: ArtistRef[] }> => {
  const artist = await resolveArtist(seed.name, providerId);
  if (!artist) {
    return { seed, related: [] };
  }
  try {
    const related = await metadataHost.fetchArtistRelatedArtists(
      artist.source.id,
      providerId,
    );
    return { seed, related: related.slice(0, RELATED_PER_SEED) };
  } catch {
    return { seed, related: [] };
  }
};

type Candidate = {
  artist: ArtistRef;
  score: number;
  because: Set<string>;
};

const scoreCandidates = (
  relatedBySeed: { seed: TasteArtist; related: ArtistRef[] }[],
  profile: TasteProfile,
  tuning: ModeTuning,
  random: () => number,
): Candidate[] => {
  const seedKeys = new Set(
    relatedBySeed.map(({ seed }) => normalizeName(seed.name)),
  );
  const maxSeedWeight = Math.max(
    1e-6,
    ...relatedBySeed.map(({ seed }) => seed.weight),
  );
  const candidates = new Map<string, Candidate>();

  relatedBySeed.forEach(({ seed, related }) => {
    related.forEach((artist, rank) => {
      const key = normalizeName(artist.name);
      if (seedKeys.has(key)) {
        return;
      }
      const isKnown = profile.knownArtistKeys.has(key);
      const knownFactor = isKnown ? tuning.knownArtistFactor : 1;
      if (knownFactor === 0) {
        return;
      }
      const rankFactor = 1 - (rank / Math.max(1, related.length)) * 0.6;
      const contribution =
        (0.5 + 0.5 * (seed.weight / maxSeedWeight)) * rankFactor * knownFactor;
      const existing = candidates.get(key) ?? {
        artist,
        score: 0,
        because: new Set<string>(),
      };
      existing.score += contribution;
      existing.because.add(seed.name);
      candidates.set(key, existing);
    });
  });

  return [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      score:
        candidate.score *
        (1 + 0.35 * (candidate.because.size - 1)) *
        (1 - tuning.variety / 2 + random() * tuning.variety),
    }))
    .sort((first, second) => second.score - first.score);
};

const pickTracksFor = async (
  candidate: Candidate,
  providerId: string,
  profile: TasteProfile,
  tuning: ModeTuning,
  random: () => number,
): Promise<DiscoverPick[]> => {
  const topTracks = await metadataHost
    .fetchArtistTopTracks(candidate.artist.source.id, providerId)
    .catch((): TrackRef[] => []);
  const fresh = topTracks
    .slice(0, tuning.topTrackDepth)
    .map(trackRefToTrack)
    .filter((track) => !profile.knownTrackKeys.has(keyOfTrack(track)));
  const chosen = weightedSample(fresh, () => 1, tuning.tracksPerArtist, random);
  return chosen.map((track) => ({
    track,
    because: [...candidate.because],
  }));
};

const interleave = (groups: DiscoverPick[][]): DiscoverPick[] => {
  const result: DiscoverPick[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let round = 0; round < longest; round++) {
    groups.forEach((group) => {
      if (group[round]) {
        result.push(group[round]);
      }
    });
  }
  return result;
};

const discoverFromRelated = async (
  provider: MetadataProvider,
  { profile, mode, seeds, random = Math.random }: DiscoverOptions,
): Promise<DiscoverResult> => {
  const tuning = MODE_TUNING[mode];
  const requestedSeeds = new Set((seeds ?? []).map(normalizeName));
  const pool =
    requestedSeeds.size > 0
      ? profile.artists.filter((artist) =>
          requestedSeeds.has(normalizeName(artist.name)),
        )
      : profile.artists.slice(0, SEED_POOL_SIZE);

  const chosenSeeds =
    requestedSeeds.size > 0
      ? pool
      : weightedSample(
          pool,
          (artist) =>
            Math.pow(Math.max(artist.weight, 0.01), tuning.seedExponent),
          tuning.seedCount,
          random,
        );

  const relatedBySeed = await mapWithConcurrency(chosenSeeds, (seed) =>
    fetchRelated(seed, provider.id),
  );
  const candidates = scoreCandidates(
    relatedBySeed,
    profile,
    tuning,
    random,
  ).slice(0, CANDIDATE_ARTISTS);

  const pickGroups = await mapWithConcurrency(candidates, (candidate) =>
    pickTracksFor(candidate, provider.id, profile, tuning, random),
  );

  return {
    picks: interleave(pickGroups).slice(0, MAX_PICKS),
    artists: candidates.map((candidate) => ({
      artist: candidate.artist,
      providerId: provider.id,
      because: [...candidate.because],
    })),
    source: 'related',
  };
};

const discoverFromProvider = async ({
  profile,
  mode,
  random = Math.random,
}: DiscoverOptions): Promise<DiscoverResult> => {
  const context = weightedSample(profile.libraryTracks, () => 1, 10, random);
  const recommendations = await discoveryHost.getRecommendations(context, {
    variety: MODE_TUNING[mode].variety,
    limit: MAX_PICKS,
  });
  return {
    picks: recommendations
      .filter((track) => !profile.knownTrackKeys.has(keyOfTrack(track)))
      .map((track) => ({ track, because: [] })),
    artists: [],
    source: 'discoveryProvider',
  };
};

export const hasDiscoverySource = (): boolean =>
  supportsRelatedDiscovery(activeMetadataProvider()) ||
  Boolean(
    providersHost.get<DiscoveryProvider>(
      providersHost.getActive('discovery'),
      'discovery',
    ),
  );

export const discover = async (
  options: DiscoverOptions,
): Promise<DiscoverResult> => {
  const metadataProvider = activeMetadataProvider();
  const hasTaste = options.profile.artists.length > 0;

  if (
    hasTaste &&
    metadataProvider &&
    supportsRelatedDiscovery(metadataProvider)
  ) {
    return discoverFromRelated(metadataProvider, options);
  }

  const discoveryProvider = providersHost.get<DiscoveryProvider>(
    providersHost.getActive('discovery'),
    'discovery',
  );
  if (discoveryProvider && options.profile.libraryTracks.length > 0) {
    return discoverFromProvider(options);
  }

  return { picks: [], artists: [], source: 'none' };
};
