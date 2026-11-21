import {
  Heart,
  Layers,
  ListEnd,
  ListMusicIcon,
  ListStart,
  Play,
  Trash2,
} from 'lucide-react';
import { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork, Track } from '@nuclearplayer/model';
import { Input, TrackContextMenu } from '@nuclearplayer/ui';

import { usePlaylistSubmenu } from '../hooks/usePlaylistSubmenu';
import { useTrackActions } from '../hooks/useTrackActions';
import { playbackManager } from '../services/playback';
import { useVersionPickerStore } from '../stores/versionPickerStore';

type ConnectedTrackContextMenuProps = {
  track: Track;
  children: ReactNode;
  playlistId?: string;
  playlistTracks?: Track[];
  index?: number;
  onRemoveFromPlaylist?: () => void;
  contextOnly?: boolean;
};

export const ConnectedTrackContextMenu: FC<ConnectedTrackContextMenuProps> = ({
  track,
  children,
  playlistId,
  playlistTracks,
  index,
  onRemoveFromPlaylist,
  contextOnly,
}) => {
  const { t } = useTranslation('track');
  const { t: tPlaylists } = useTranslation('playlists');
  const trackActions = useTrackActions();
  const playlistSubmenu = usePlaylistSubmenu();
  const openVersionPicker = useVersionPickerStore((state) => state.open);

  const isFavorite = trackActions.isFavorite(track);
  const thumbnail = pickArtwork(track.artwork, 'thumbnail', 64)?.url;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const playNow = () => {
    if (playlistId && playlistTracks && index !== undefined) {
      playbackManager.playTracks(playlistTracks, playlistId, index);
      return;
    }
    trackActions.playNow(track);
  };

  return (
    <TrackContextMenu>
      <TrackContextMenu.Trigger contextOnly={contextOnly}>
        {children}
      </TrackContextMenu.Trigger>
      <TrackContextMenu.Content>
        <TrackContextMenu.Header
          title={track.title}
          subtitle={artistNames}
          coverUrl={thumbnail}
        />
        <TrackContextMenu.Action icon={<Play size={16} />} onClick={playNow}>
          {t('actions.playNow')}
        </TrackContextMenu.Action>
        <TrackContextMenu.Action
          icon={<ListStart size={16} />}
          onClick={() => trackActions.addNext(track, playlistId)}
        >
          {t('actions.playNext')}
        </TrackContextMenu.Action>
        <TrackContextMenu.Action
          icon={<ListEnd size={16} />}
          onClick={() => trackActions.addToQueue(track, playlistId)}
        >
          {t('actions.addToQueue')}
        </TrackContextMenu.Action>
        <TrackContextMenu.Action
          icon={<Layers size={16} />}
          onClick={() => openVersionPicker(track, playlistId)}
          data-testid="choose-version-action"
        >
          {t('actions.chooseVersion')}
        </TrackContextMenu.Action>
        <TrackContextMenu.Action
          icon={<Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />}
          onClick={() => trackActions.toggleFavorite(track)}
        >
          {isFavorite
            ? t('actions.removeFromFavorites')
            : t('actions.addToFavorites')}
        </TrackContextMenu.Action>
        {playlistSubmenu.hasPlaylists && (
          <TrackContextMenu.Submenu>
            <TrackContextMenu.Submenu.Trigger
              icon={<ListMusicIcon size={16} />}
            >
              {tPlaylists('addToPlaylist')}
            </TrackContextMenu.Submenu.Trigger>
            <TrackContextMenu.Submenu.Content>
              {playlistSubmenu.showFilter && (
                <div onKeyDown={(event) => event.stopPropagation()}>
                  <Input
                    size="sm"
                    variant="borderless"
                    placeholder={tPlaylists('filterPlaylists')}
                    value={playlistSubmenu.filterText}
                    onChange={(event) =>
                      playlistSubmenu.setFilterText(event.target.value)
                    }
                    data-testid="playlist-filter-input"
                  />
                </div>
              )}
              {playlistSubmenu.playlists.map((entry) => (
                <TrackContextMenu.Action
                  key={entry.id}
                  onClick={() => playlistSubmenu.addTracks(entry.id, [track])}
                  data-testid="playlist-submenu-item"
                >
                  {entry.name}
                </TrackContextMenu.Action>
              ))}
            </TrackContextMenu.Submenu.Content>
          </TrackContextMenu.Submenu>
        )}
        {onRemoveFromPlaylist && (
          <TrackContextMenu.Action
            icon={<Trash2 size={16} />}
            onClick={onRemoveFromPlaylist}
          >
            {t('actions.removeFromPlaylist')}
          </TrackContextMenu.Action>
        )}
      </TrackContextMenu.Content>
    </TrackContextMenu>
  );
};
