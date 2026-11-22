import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork, type PlaylistIndexEntry } from '@nuclearplayer/model';
import type {
  MetadataProvider,
  SearchResults,
} from '@nuclearplayer/plugin-sdk';
import {
  Button,
  Card,
  CardGrid,
  Tabs,
  TabsItem,
  ViewShell,
} from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import { useActiveProvider } from '../../hooks/useActiveProvider';
import { useNavigateToPlaylist } from '../../hooks/useNavigateToPlaylist';
import { metadataHost } from '../../services/metadataHost';
import { PlaylistIndexTree } from '../../stores/PlaylistIndexTree';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useAiBackend } from '../Discover/hooks/useDiscover';
import { PlaylistCard } from '../Playlists/components/PlaylistCard';
import { SearchEmptyState } from './SearchEmptyState';

const SearchContent: FC<{
  provider: MetadataProvider | undefined;
  isLoading: boolean;
  isError: boolean;
  results: SearchResults | undefined;
  refetch: () => void;
  localPlaylists: PlaylistIndexEntry[];
}> = ({ provider, isLoading, isError, results, refetch, localPlaylists }) => {
  const { t } = useTranslation(['search', 'common']);
  const navigate = useNavigate();
  const navigateToPlaylist = useNavigateToPlaylist();
  const playlistTab = (localPlaylists.length > 0 ||
    (results?.playlists?.length ?? 0) > 0) && {
    id: 'playlists',
    label: t('search:results.playlists'),
    content: (
      <CardGrid>
        {localPlaylists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            onClick={() =>
              navigate({
                to: '/playlists/$playlistId',
                params: { playlistId: playlist.id },
              })
            }
          />
        ))}
        {results?.playlists?.map((playlist) => {
          const url = playlist.source.url;
          return (
            <Card
              key={`${playlist.source.provider}:${playlist.source.id}`}
              title={playlist.name}
              src={pickArtwork(playlist.artwork, 'cover', 300)?.url}
              onClick={url ? () => navigateToPlaylist(url) : undefined}
            />
          );
        })}
      </CardGrid>
    ),
  };
  const localResults = playlistTab && (
    <Tabs items={[playlistTab]} className="flex-1" />
  );

  if (!provider) {
    return localResults || <SearchEmptyState />;
  }

  if (isLoading) {
    return localResults || <CardGrid.Skeleton data-testid="search-skeleton" />;
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="text-accent-red">{t('search:failedToLoad')}</div>
        <Button
          onClick={() => {
            void refetch();
          }}
        >
          {t('common:actions.retry')}
        </Button>
        {localResults}
      </div>
    );
  }

  const tabsItems = [
    results?.albums && {
      id: 'albums',
      label: t('search:results.albums'),
      content: (
        <CardGrid>
          {results.albums.map((item) => (
            <Card
              key={item.source.id}
              title={item.title}
              src={pickArtwork(item.artwork, 'cover', 300)?.url}
              onClick={() =>
                navigate({ to: `/album/${provider.id}/${item.source.id}` })
              }
            />
          ))}
        </CardGrid>
      ),
    },
    results?.artists && {
      id: 'artists',
      label: t('search:results.artists'),
      content: (
        <CardGrid>
          {results.artists.map((item) => (
            <Card
              key={item.source.id}
              title={item.name}
              src={pickArtwork(item.artwork, 'cover', 300)?.url}
              onClick={() =>
                navigate({ to: `/artist/${provider.id}/${item.source.id}` })
              }
            />
          ))}
        </CardGrid>
      ),
    },
    results?.tracks && {
      id: 'tracks',
      label: t('search:results.tracks'),
      content: (
        <div className="flex flex-col">
          <ConnectedTrackTable
            features={{ playAll: true, addAllToQueue: true }}
            tracks={results.tracks}
          />
        </div>
      ),
    },
    playlistTab,
  ].filter(Boolean);

  return <Tabs items={tabsItems as TabsItem[]} className="flex-1" />;
};

const AskAiBanner: FC<{ query: string }> = ({ query }) => {
  const { t } = useTranslation('discovery');
  const navigate = useNavigate();
  const { data: backend } = useAiBackend();

  if (!backend || !query) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="search-ask-ai"
      onClick={() => navigate({ to: '/discover', search: { ai: query } })}
      className="border-border bg-primary/10 hover:bg-primary/15 text-foreground mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border-(length:--border-width) px-4 py-3 text-left text-sm transition-colors"
    >
      <Sparkles size={18} className="text-primary shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {t('ai.askAboutSearch', { query })}
      </span>
    </button>
  );
};

export const Search: FC = () => {
  const { t } = useTranslation(['search', 'common']);
  const { q } = useSearch({ from: '/search' });
  const index = usePlaylistStore((state) => state.index);
  const query = q.trim().toLowerCase();
  const localPlaylists = useMemo(
    () =>
      query
        ? new PlaylistIndexTree(index)
            .playlists()
            .filter((playlist) => playlist.name.toLowerCase().includes(query))
        : [],
    [index, query],
  );

  const provider = useActiveProvider('metadata') as
    MetadataProvider | undefined;

  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useQuery<SearchResults>({
    queryKey: ['metadata-search', provider?.id, q],
    queryFn: () =>
      metadataHost.search({
        query: q,
      }),
    enabled: Boolean(provider && q),
  });

  return (
    <ViewShell
      data-testid="search-view"
      title={t('search:title')}
      subtitle={`${t('search:query')}: "${q}"`}
    >
      <AskAiBanner query={q} />
      <SearchContent
        provider={provider}
        isLoading={isLoading}
        isError={isError}
        results={results}
        refetch={refetch}
        localPlaylists={localPlaylists}
      />
    </ViewShell>
  );
};
