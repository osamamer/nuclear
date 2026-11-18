import { useMutation, useQuery } from '@tanstack/react-query';

import { useCoreSetting } from '../../../hooks/useCoreSetting';
import { useProviders } from '../../../hooks/useProviders';
import { resolveAiBackend } from '../../../services/ai/aiClient';
import { curateWithAi } from '../../../services/ai/musicCurator';
import { discover } from '../../../services/discover/discoverEngine';
import type { TasteProfile } from '../../../services/discover/tasteProfile';
import { buildTasteProfile } from '../../../services/discover/tasteProfile';
import { useDiscoverStore } from '../../../stores/discoverStore';
import { useFavoritesStore } from '../../../stores/favoritesStore';
import { usePlaylistStore } from '../../../stores/playlistStore';
import { useProvidersStore } from '../../../stores/providersStore';

const TASTE_STALE_MS = 5 * 60 * 1000;

export const useTasteProfile = () => {
  const playlistsLoaded = usePlaylistStore((state) => state.loaded);
  const favoritesLoaded = useFavoritesStore((state) => state.loaded);

  return useQuery({
    queryKey: ['discover', 'taste', playlistsLoaded, favoritesLoaded],
    queryFn: buildTasteProfile,
    staleTime: TASTE_STALE_MS,
  });
};

export const useDiscoverPicks = (profile: TasteProfile | undefined) => {
  const mode = useDiscoverStore((state) => state.mode);
  const seeds = useDiscoverStore((state) => state.seeds);
  const shuffleCount = useDiscoverStore((state) => state.shuffleCount);
  const metadataProviders = useProviders('metadata');
  const discoveryProviders = useProviders('discovery');
  const activeMetadata = useProvidersStore((state) => state.active.metadata);
  const providerKey = [
    activeMetadata,
    metadataProviders.length,
    discoveryProviders.length,
  ].join(':');

  return useQuery({
    queryKey: ['discover', 'picks', mode, seeds, shuffleCount, providerKey],
    queryFn: () => discover({ profile: profile!, mode, seeds }),
    enabled: Boolean(profile),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
};

export const useAiBackend = () => {
  const [backend] = useCoreSetting<string>('ai.backend');
  const [apiKey] = useCoreSetting<string>('ai.anthropicApiKey');

  return useQuery({
    queryKey: ['ai', 'backend', backend, Boolean(apiKey)],
    queryFn: resolveAiBackend,
    staleTime: 60 * 1000,
  });
};

export const useAiCurator = (profile: TasteProfile | undefined) => {
  const setAiResult = useDiscoverStore((state) => state.setAiResult);

  return useMutation({
    mutationFn: (request: string) => curateWithAi(request, profile),
    onSuccess: setAiResult,
  });
};
