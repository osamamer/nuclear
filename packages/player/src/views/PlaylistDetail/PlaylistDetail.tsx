import isEmpty from 'lodash-es/isEmpty';
import { FilterIcon, ListMusicIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { EmptyState, Input } from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import { useCurrentQueueItem } from '../../hooks/useCurrentQueueItem';
import { sortPlaylistItems } from '../../services/sortPlaylistItems';
import { usePlaylistPreferencesStore } from '../../stores/playlistPreferencesStore';
import { PlaylistDetailHeader } from '../Playlists/components/PlaylistDetailHeader';
import { PlaylistDetailActions } from './components/PlaylistDetailActions';
import { PlaylistTrackSort } from './components/PlaylistTrackSort';
import { usePlaylistDetail } from './usePlaylistDetail';
import { usePlaylistEditing } from './usePlaylistEditing';

export const PlaylistDetail: FC = () => {
  const { t } = useTranslation('playlists');
  const { t: tTrackTable } = useTranslation('trackTable');
  const { playlistId, playlist, items, thumbnails } = usePlaylistDetail();
  const [filterValue, setFilterValue] = useState('');
  useEffect(() => setFilterValue(''), [playlistId]);
  const trackSortBy = usePlaylistPreferencesStore(
    (state) => state.trackSortByPlaylist[playlistId] ?? 'playlistOrder',
  );
  const setTrackSortBy = usePlaylistPreferencesStore(
    (state) => state.setTrackSortBy,
  );
  const currentTrack = useCurrentQueueItem()?.track;
  const sortedItems = useMemo(
    () => sortPlaylistItems(items, trackSortBy),
    [items, trackSortBy],
  );
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
    <div
      className="surface-background flex h-full min-h-0 flex-col"
      data-testid="playlist-detail-view"
    >
      {playlist && (
        <PlaylistDetailHeader
          playlist={playlist}
          thumbnails={thumbnails}
          className="mx-6 mt-4 shrink-0"
          controls={
            !isEmpty(tracks) && (
              <>
                <PlaylistTrackSort
                  value={trackSortBy}
                  onChange={(sortBy) => setTrackSortBy(playlistId, sortBy)}
                />
                <Input
                  size="sm"
                  tone="secondary"
                  className="font-semibold"
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  placeholder={tTrackTable('filterPlaceholder')}
                  aria-label={tTrackTable('filterPlaceholder')}
                  endAddon={
                    <FilterIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                      strokeWidth={3}
                    />
                  }
                />
              </>
            )
          }
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
        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-6">
          <div className="min-h-0 flex-1">
            <ConnectedTrackTable
              tracks={tracks}
              filterValue={filterValue}
              onFilterChange={setFilterValue}
              playOnRowClick
              sourcePlaylistId={playlistId}
              activeTrackKey={
                currentTrack
                  ? `${currentTrack.source.provider}/${currentTrack.source.id}`
                  : undefined
              }
              getItemId={editing.getItemId}
              features={{
                header: true,
                filterable: false,
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
        </div>
      )}
    </div>
  );
};
