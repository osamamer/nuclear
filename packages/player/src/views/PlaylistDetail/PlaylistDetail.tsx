import isEmpty from 'lodash-es/isEmpty';
import { ListMusicIcon } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { EmptyState, ScrollableArea } from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import { useCurrentQueueItem } from '../../hooks/useCurrentQueueItem';
import { PlaylistDetailHeader } from '../Playlists/components/PlaylistDetailHeader';
import { PlaylistDetailActions } from './components/PlaylistDetailActions';
import {
  PlaylistTrackSort,
  type PlaylistTrackSortBy,
} from './components/PlaylistTrackSort';
import { usePlaylistDetail } from './usePlaylistDetail';
import { usePlaylistEditing } from './usePlaylistEditing';

export const PlaylistDetail: FC = () => {
  const { t } = useTranslation('playlists');
  const { playlistId, playlist, items, thumbnails } = usePlaylistDetail();
  const [trackSortBy, setTrackSortBy] =
    useState<PlaylistTrackSortBy>('playlistOrder');
  const currentTrack = useCurrentQueueItem()?.track;
  const sortedItems = useMemo(() => {
    if (trackSortBy === 'reverse') {
      return [...items].reverse();
    }

    if (trackSortBy === 'dateAddedNewest') {
      return [...items].sort((left, right) =>
        right.addedAtIso.localeCompare(left.addedAtIso),
      );
    }

    if (trackSortBy === 'dateAddedOldest') {
      return [...items].sort((left, right) =>
        left.addedAtIso.localeCompare(right.addedAtIso),
      );
    }

    return items;
  }, [items, trackSortBy]);
  const tracks = useMemo(
    () => sortedItems.map((item) => item.track),
    [sortedItems],
  );
  const editing = usePlaylistEditing(
    playlistId,
    sortedItems,
    Boolean(playlist && !playlist.isReadOnly),
  );

  return (
    <ScrollableArea
      className="surface-background"
      data-testid="playlist-detail-view"
    >
      {playlist && (
        <PlaylistDetailHeader
          playlist={playlist}
          thumbnails={thumbnails}
          className="mx-6 mt-6"
        >
          <PlaylistDetailActions playlistId={playlistId} tracks={tracks} />
        </PlaylistDetailHeader>
      )}
      {isEmpty(tracks) ? (
        <EmptyState
          icon={<ListMusicIcon size={48} />}
          title={t('emptyTracks')}
          description={t('emptyTracksDescription')}
          className="flex-1"
        />
      ) : (
        <div className="h-full p-6">
          <div className="mb-3 flex justify-end">
            <PlaylistTrackSort value={trackSortBy} onChange={setTrackSortBy} />
          </div>
          <ConnectedTrackTable
            tracks={tracks}
            playOnRowClick
            activeTrackKey={
              currentTrack
                ? `${currentTrack.source.provider}/${currentTrack.source.id}`
                : undefined
            }
            getItemId={editing.getItemId}
            features={{
              header: true,
              reorderable:
                editing.isEditable && trackSortBy === 'playlistOrder',
            }}
            display={{
              displayThumbnail: true,
              displayArtist: true,
              displayDuration: tracks.some((t) => t.durationMs != null),
              displayQueueControls: true,
              displayDeleteButton: editing.isEditable,
            }}
            actions={editing.actions}
          />
        </div>
      )}
    </ScrollableArea>
  );
};
