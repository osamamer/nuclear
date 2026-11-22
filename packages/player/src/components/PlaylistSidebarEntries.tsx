import { LayoutGrid } from 'lucide-react';
import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { SidebarNavigationItem } from '@nuclearplayer/ui';

import { useCurrentQueueItem } from '../hooks/useCurrentQueueItem';
import { usePlaybackActivity } from '../hooks/usePlaybackActivity';
import { PlaylistIndexTree } from '../stores/PlaylistIndexTree';
import { usePlaylistPreferencesStore } from '../stores/playlistPreferencesStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { PlaylistArtwork } from '../views/Playlists/components/PlaylistArtwork';
import { PlaylistContextMenu } from './PlaylistContextMenu';

type PlaylistSidebarEntriesProps = {
  isCompact: boolean;
  activeOnly?: boolean;
};

export const PlaylistSidebarEntries: FC<PlaylistSidebarEntriesProps> = ({
  isCompact,
  activeOnly = false,
}) => {
  const { t } = useTranslation('playlists');
  const index = usePlaylistStore((state) => state.index);
  const lastPlayed = usePlaylistPreferencesStore(
    (state) => state.lastPlayedByPlaylist,
  );
  const currentPlaylistId = useCurrentQueueItem()?.playlistId;
  const { hasStartedPlayback, isPaused } = usePlaybackActivity();
  const playlists = new PlaylistIndexTree(index)
    .playlists()
    .filter(
      (playlist) =>
        !activeOnly ||
        (hasStartedPlayback && currentPlaylistId === playlist.id),
    )
    .sort(
      (left, right) => (lastPlayed[right.id] ?? 0) - (lastPlayed[left.id] ?? 0),
    );

  if (activeOnly && playlists.length === 0) {
    return null;
  }

  return (
    <div
      className={
        isCompact
          ? 'mt-1 flex flex-col gap-1'
          : 'border-foreground/15 mt-1 ml-5 flex flex-col gap-1 border-l pl-2'
      }
    >
      {!activeOnly && (
        <SidebarNavigationItem
          to="/playlists"
          icon={<LayoutGrid />}
          label={t('allPlaylists')}
          exact
        />
      )}
      {playlists.map((playlist) => {
        const isPlaying =
          hasStartedPlayback && currentPlaylistId === playlist.id;

        return (
          <PlaylistContextMenu
            key={playlist.id}
            playlistId={playlist.id}
            hasTracks={playlist.itemCount > 0}
            anchor="right start"
          >
            <SidebarNavigationItem
              to={`/playlists/${encodeURIComponent(playlist.id)}`}
              icon={
                <PlaylistArtwork
                  name={playlist.name}
                  thumbnails={playlist.thumbnails}
                  className="overflow-hidden rounded-md"
                />
              }
              label={playlist.name}
              isSelected={isPlaying}
              isPlaying={isPlaying}
              isPaused={isPaused}
              playingLabel={t('nowPlaying')}
              exact
            />
          </PlaylistContextMenu>
        );
      })}
    </div>
  );
};
