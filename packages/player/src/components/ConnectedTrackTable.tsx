import { FC, useCallback, useMemo } from 'react';

import type { Track } from '@nuclearplayer/model';
import {
  ContextMenuWrapperProps,
  TrackTable,
  TrackTableActions,
  TrackTableProps,
} from '@nuclearplayer/ui';

import { useQueueActions } from '../hooks/useQueueActions';
import { useTrackActions } from '../hooks/useTrackActions';
import { useTrackTableLabels } from '../hooks/useTrackTableLabels';
import { playbackManager } from '../services/playback';
import { ConnectedTrackContextMenu } from './ConnectedTrackContextMenu';

type ConnectedTrackTableProps = Omit<
  TrackTableProps<Track>,
  'actions' | 'meta' | 'labels'
> & {
  actions?: Pick<TrackTableActions<Track>, 'onRemove' | 'onReorder'>;
  activeTrackKey?: string;
  playOnRowClick?: boolean;
  sourcePlaylistId?: string;
};

export const ConnectedTrackTable: FC<ConnectedTrackTableProps> = (props) => {
  const {
    actions: externalActions,
    activeTrackKey,
    playOnRowClick,
    sourcePlaylistId,
    ...restProps
  } = props;
  const { tracks, display } = restProps;
  const trackActions = useTrackActions();
  const queueActions = useQueueActions();
  const labels = useTrackTableLabels();

  const playNow = useCallback(
    (track: Track, index: number) => {
      if (sourcePlaylistId) {
        playbackManager.playTracks(tracks, sourcePlaylistId, index);
        return;
      }
      trackActions.playNow(track);
    },
    [sourcePlaylistId, tracks, trackActions],
  );

  const TrackContextMenuWrapper = useMemo<FC<ContextMenuWrapperProps<Track>>>(
    () =>
      function TrackContextMenuWrapper({ track, children, index }) {
        return (
          <ConnectedTrackContextMenu
            track={track}
            playlistId={sourcePlaylistId}
            playlistTracks={tracks}
            index={index}
          >
            {children}
          </ConnectedTrackContextMenu>
        );
      },
    [sourcePlaylistId, tracks],
  );

  const resolvedDisplay = useMemo(
    () => ({
      displayFavorite: true,
      ...display,
    }),
    [display],
  );

  const onRemove = externalActions?.onRemove;
  const onReorder = externalActions?.onReorder;
  const actions = useMemo<TrackTableActions<Track>>(
    () => ({
      onAddToQueue: (track: Track) =>
        queueActions.addToQueue([track], sourcePlaylistId),
      onPlayNow: playNow,
      onRowClick: playOnRowClick ? playNow : undefined,
      onPlayNext: (track: Track) =>
        queueActions.addNext([track], sourcePlaylistId),
      onToggleFavorite: trackActions.toggleFavorite,
      onRemove,
      onReorder,
      onPlayAll: () => playbackManager.playTracks(tracks, sourcePlaylistId),
      onAddAllToQueue: () => {
        queueActions.addToQueue(tracks, sourcePlaylistId);
      },
    }),
    [
      queueActions,
      sourcePlaylistId,
      playNow,
      playOnRowClick,
      trackActions.toggleFavorite,
      onRemove,
      onReorder,
      tracks,
    ],
  );

  const meta = useMemo(
    () => ({
      isTrackFavorite: trackActions.isFavorite,
      ContextMenuWrapper: TrackContextMenuWrapper,
      activeTrackKey,
    }),
    [trackActions.isFavorite, TrackContextMenuWrapper, activeTrackKey],
  );

  return (
    <TrackTable
      {...restProps}
      labels={labels}
      display={resolvedDisplay}
      actions={actions}
      meta={meta}
    />
  );
};
