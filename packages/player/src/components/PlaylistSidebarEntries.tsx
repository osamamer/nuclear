import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { SidebarNavigationItem } from '@nuclearplayer/ui';

import { useCurrentQueueItem } from '../hooks/useCurrentQueueItem';
import { usePlaybackActivity } from '../hooks/usePlaybackActivity';
import { PlaylistIndexTree } from '../stores/PlaylistIndexTree';
import { usePlaylistStore } from '../stores/playlistStore';
import { PlaylistArtwork } from '../views/Playlists/components/PlaylistArtwork';

type PlaylistSidebarEntriesProps = {
  isCompact: boolean;
};

export const PlaylistSidebarEntries: FC<PlaylistSidebarEntriesProps> = ({
  isCompact,
}) => {
  const { t } = useTranslation('playlists');
  const index = usePlaylistStore((state) => state.index);
  const currentPlaylistId = useCurrentQueueItem()?.playlistId;
  const { hasStartedPlayback, isPaused } = usePlaybackActivity();
  const playlists = new PlaylistIndexTree(index).playlists();

  if (playlists.length === 0) {
    return null;
  }

  return (
    <div
      className={
        isCompact
          ? 'flex flex-col gap-1'
          : 'border-foreground/15 ml-5 flex flex-col gap-1 border-l pl-2'
      }
    >
      {playlists.map((playlist) => {
        const isPlaying =
          hasStartedPlayback && currentPlaylistId === playlist.id;

        return (
          <SidebarNavigationItem
            key={playlist.id}
            to={`/playlists/${encodeURIComponent(playlist.id)}`}
            icon={
              <PlaylistArtwork
                name={playlist.name}
                thumbnails={playlist.thumbnails}
                className="rounded-md"
              />
            }
            label={playlist.name}
            isPlaying={isPlaying}
            isPaused={isPaused}
            playingLabel={t('nowPlaying')}
            exact
          />
        );
      })}
    </div>
  );
};
