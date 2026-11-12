import { FC } from 'react';

import type { Track } from '@nuclearplayer/model';
import {
  TrackTable,
  TrackTableActions,
  TrackTableProps,
} from '@nuclearplayer/ui';

import { useQueueActions } from '../hooks/useQueueActions';
import { useTrackActions } from '../hooks/useTrackActions';
import { useTrackTableLabels } from '../hooks/useTrackTableLabels';
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
  const trackActions = useTrackActions();
  const queueActions = useQueueActions();
  const labels = useTrackTableLabels();
  const playNow = (track: Track) =>
    sourcePlaylistId
      ? queueActions.playNow(track, sourcePlaylistId)
      : trackActions.playNow(track);
  const addToQueue = (track: Track) =>
    queueActions.addToQueue([track], sourcePlaylistId);
  const addNext = (track: Track) =>
    queueActions.addNext([track], sourcePlaylistId);

  return (
    <TrackTable
      {...restProps}
      labels={labels}
      display={{
        displayFavorite: true,
        ...restProps.display,
      }}
      actions={{
        onAddToQueue: addToQueue,
        onPlayNow: playNow,
        onRowClick: playOnRowClick ? playNow : undefined,
        onPlayNext: addNext,
        onToggleFavorite: trackActions.toggleFavorite,
        onRemove: externalActions?.onRemove,
        onReorder: externalActions?.onReorder,
        onPlayAll: () => {
          queueActions.clearQueue();
          queueActions.addToQueue(restProps.tracks, sourcePlaylistId);
        },
        onAddAllToQueue: () => {
          queueActions.addToQueue(restProps.tracks, sourcePlaylistId);
        },
      }}
      meta={{
        isTrackFavorite: trackActions.isFavorite,
        ContextMenuWrapper: ConnectedTrackContextMenu,
        activeTrackKey,
      }}
    />
  );
};
