import { useNavigate } from '@tanstack/react-router';
import isEmpty from 'lodash-es/isEmpty';
import { ArrowUpRight, LibraryBig } from 'lucide-react';
import { FC, useMemo } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { PlaylistIndexEntry } from '@nuclearplayer/model';
import type { DashboardProvider } from '@nuclearplayer/plugin-sdk';
import { formatTimeMillis, ViewShell } from '@nuclearplayer/ui';

import { useProviders } from '../../hooks/useProviders';
import { PlaylistIndexTree } from '../../stores/PlaylistIndexTree';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useStartupStore } from '../../stores/startupStore';
import { PlaylistArtwork } from '../Playlists/components/PlaylistArtwork';
import { DashboardEmptyState } from './components/DashboardEmptyState';
import { DashboardStartupSkeleton } from './components/DashboardStartupSkeleton';
import { DASHBOARD_WIDGETS, DashboardWidgetEntry } from './dashboardWidgets';

const DashboardContent: FC<{
  isStartingUp: boolean;
  activeWidgets: DashboardWidgetEntry[];
}> = ({ isStartingUp, activeWidgets }) => {
  if (isStartingUp) {
    return <DashboardStartupSkeleton />;
  }

  if (isEmpty(activeWidgets)) {
    return <DashboardEmptyState />;
  }

  return activeWidgets.map(({ capability, component: Widget }) => (
    <Widget key={capability} />
  ));
};

const YourPlaylists: FC<{ playlists: PlaylistIndexEntry[] }> = ({
  playlists,
}) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  return (
    <section
      data-testid="dashboard-your-playlists"
      className="border-border/60 bg-muted/35 mb-10 w-full rounded-3xl border p-5 sm:p-7"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary mb-2 text-xs font-bold tracking-[0.2em] uppercase">
            {t('library-label')}
          </p>
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('your-playlists')}
          </h2>
        </div>
        <button
          type="button"
          className="text-foreground/75 hover:text-foreground flex cursor-pointer items-center gap-1 text-sm font-semibold transition-colors"
          onClick={() => navigate({ to: '/playlists' })}
        >
          {t('view-all-playlists')}
          <ArrowUpRight size={16} />
        </button>
      </div>
      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              data-testid="dashboard-playlist-card"
              className="border-border/70 bg-background hover:border-primary/60 hover:bg-muted/70 group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-2 text-left transition-colors"
              onClick={() =>
                navigate({
                  to: '/playlists/$playlistId',
                  params: { playlistId: playlist.id },
                })
              }
            >
              <div className="bg-muted size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
                <PlaylistArtwork
                  name={playlist.name}
                  thumbnails={playlist.thumbnails}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-foreground block truncate font-semibold">
                  {playlist.name}
                </span>
                <span className="text-foreground/55 block truncate text-xs">
                  {t('playlists:trackCount', { count: playlist.itemCount })}
                  {playlist.totalDurationMs > 0 &&
                    ` · ${formatTimeMillis(playlist.totalDurationMs)}`}
                </span>
              </div>
              <ArrowUpRight
                size={17}
                className="text-foreground/35 group-hover:text-primary mr-1 shrink-0 transition-colors"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-foreground/60 flex items-center gap-3 rounded-2xl border border-dashed border-current px-5 py-7 text-sm">
          <LibraryBig size={25} className="shrink-0" />
          {t('no-playlists')}
        </div>
      )}
    </section>
  );
};

export const Dashboard: FC = () => {
  const { t } = useTranslation('dashboard');
  const index = usePlaylistStore((state) => state.index);
  const isStartingUp = useStartupStore((state) => state.isStartingUp);
  const providers = useProviders('dashboard') as DashboardProvider[];
  const playlists = useMemo(
    () =>
      new PlaylistIndexTree(index)
        .playlists()
        .sort((first, second) =>
          second.lastModifiedIso.localeCompare(first.lastModifiedIso),
        )
        .slice(0, 8),
    [index],
  );

  const activeWidgets = useMemo(() => {
    const capabilities = new Set(
      providers.flatMap((provider) => provider.capabilities),
    );

    return DASHBOARD_WIDGETS.filter((widget) =>
      capabilities.has(widget.capability),
    );
  }, [providers]);

  return (
    <ViewShell data-testid="dashboard-view" title={t('home-title')}>
      <YourPlaylists playlists={playlists} />
      {(isStartingUp || activeWidgets.length > 0) && (
        <div className="mb-5 w-full">
          <p className="text-foreground/45 mb-1 text-xs font-bold tracking-[0.2em] uppercase">
            {t('discover-label')}
          </p>
          <h2 className="text-foreground text-2xl font-bold">
            {t('discover-title')}
          </h2>
        </div>
      )}
      {(isStartingUp || activeWidgets.length > 0 || playlists.length === 0) && (
        <DashboardContent
          isStartingUp={isStartingUp}
          activeWidgets={activeWidgets}
        />
      )}
    </ViewShell>
  );
};
