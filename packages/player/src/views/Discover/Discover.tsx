import { useNavigate, useSearch } from '@tanstack/react-router';
import { Compass, Dices, History as HistoryIcon } from 'lucide-react';
import { FC, useEffect } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  Button,
  EmptyState,
  FilterChips,
  Skeleton,
  ViewShell,
} from '@nuclearplayer/ui';

import type {
  DiscoverMode,
  DiscoverPick,
} from '../../services/discover/discoverEngine';
import { useDiscoverStore } from '../../stores/discoverStore';
import { useSettingsModalStore } from '../../stores/settingsModalStore';
import { AiCurator } from './components/AiCurator';
import { DiscoverArtists } from './components/DiscoverArtists';
import { TasteDna } from './components/TasteDna';
import { TrackDeck } from './components/TrackDeck';
import { useDiscoverPicks, useTasteProfile } from './hooks/useDiscover';

const MODES: DiscoverMode[] = ['familiar', 'balanced', 'adventurous'];

const PicksSkeleton: FC = () => (
  <div
    data-testid="discover-picks-loading"
    className="mb-10 grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    {Array.from({ length: 10 }, (_, index) => (
      <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
    ))}
  </div>
);

const useBecauseLabel = () => {
  const { t } = useTranslation('discovery');
  return (pick: DiscoverPick) =>
    pick.because.length > 0
      ? t('page.because', { artists: pick.because.slice(0, 2).join(' & ') })
      : undefined;
};

const useAiPromptFromSearch = () => {
  const { ai } = useSearch({ from: '/discover' });
  const navigate = useNavigate();
  const queueAiRequest = useDiscoverStore((state) => state.queueAiRequest);

  useEffect(() => {
    if (ai) {
      queueAiRequest(ai);
      navigate({ to: '/discover', search: {}, replace: true });
    }
  }, [ai, navigate, queueAiRequest]);
};

export const Discover: FC = () => {
  const { t } = useTranslation('discovery');
  const mode = useDiscoverStore((state) => state.mode);
  const setMode = useDiscoverStore((state) => state.setMode);
  const reshuffle = useDiscoverStore((state) => state.reshuffle);
  const becauseLabel = useBecauseLabel();
  useAiPromptFromSearch();

  const { data: profile, isLoading: isProfileLoading } = useTasteProfile();
  const {
    data: picks,
    isFetching: isFetchingPicks,
    isError: isPicksError,
  } = useDiscoverPicks(profile);

  const hasTaste = Boolean(profile && profile.artists.length > 0);
  const isLoadingPicks = isProfileLoading || (isFetchingPicks && !picks);
  const noSource = picks?.source === 'none';

  return (
    <ViewShell
      data-testid="discover-view"
      title={t('page.title')}
      subtitle={t('page.subtitle')}
    >
      <AiCurator profile={profile} />

      {hasTaste && profile && <TasteDna artists={profile.artists} />}

      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <FilterChips
          data-testid="discover-mode"
          items={MODES.map((id) => ({ id, label: t(`page.modes.${id}`) }))}
          selected={mode}
          onChange={(id) => setMode(id as DiscoverMode)}
        />
        <Button
          size="sm"
          data-testid="discover-shuffle"
          disabled={isFetchingPicks}
          onClick={reshuffle}
        >
          <Dices
            size={16}
            className={isFetchingPicks ? 'mr-1.5 animate-spin' : 'mr-1.5'}
          />
          {t('page.shuffle')}
        </Button>
      </div>

      {isLoadingPicks && <PicksSkeleton />}

      {!isLoadingPicks && !hasTaste && (
        <EmptyState
          data-testid="discover-no-taste"
          icon={<HistoryIcon size={40} />}
          title={t('page.noTasteTitle')}
          description={t('page.noTasteDescription')}
        />
      )}

      {!isLoadingPicks && hasTaste && (noSource || isPicksError) && (
        <EmptyState
          data-testid="discover-no-source"
          icon={<Compass size={40} />}
          title={t('page.noSourceTitle')}
          description={t('page.noSourceDescription')}
          action={
            <Button
              onClick={() =>
                useSettingsModalStore.getState().open('app-plugins')
              }
            >
              {t('page.browsePlugins')}
            </Button>
          }
        />
      )}

      {!isLoadingPicks && picks && picks.picks.length > 0 && (
        <TrackDeck
          data-testid="discover-picks"
          eyebrow={t(`page.modeEyebrow.${mode}`)}
          title={t('page.picksTitle')}
          entries={picks.picks.map((pick, index) => ({
            id: `pick-${index}-${pick.track.source.provider}-${pick.track.source.id}`,
            track: pick.track,
            note: becauseLabel(pick),
          }))}
        />
      )}

      {!isLoadingPicks && picks && <DiscoverArtists artists={picks.artists} />}

      {profile && profile.forgottenFavorites.length > 0 && (
        <TrackDeck
          data-testid="discover-rediscover"
          eyebrow={t('page.rediscoverEyebrow')}
          title={t('page.rediscoverTitle')}
          subtitle={t('page.rediscoverSubtitle')}
          entries={profile.forgottenFavorites.map((track, index) => ({
            id: `again-${index}-${track.source.id}`,
            track,
          }))}
        />
      )}
    </ViewShell>
  );
};
