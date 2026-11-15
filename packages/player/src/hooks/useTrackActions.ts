import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { Track } from '@nuclearplayer/model';

import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueActions } from './useQueueActions';

export const useTrackActions = () => {
  const queueActions = useQueueActions();
  const { favoriteTracks, isTrackFavorite, addTrack, removeTrack } =
    useFavoritesStore(
      useShallow((state) => ({
        favoriteTracks: state.tracks,
        isTrackFavorite: state.isTrackFavorite,
        addTrack: state.addTrack,
        removeTrack: state.removeTrack,
      })),
    );

  const playNow = useCallback(
    (track: Track) => queueActions.playNow(track),
    [queueActions],
  );

  const addNext = useCallback(
    (track: Track) => queueActions.addNext([track]),
    [queueActions],
  );

  const addToQueue = useCallback(
    (track: Track) => queueActions.addToQueue([track]),
    [queueActions],
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      if (isTrackFavorite(track.source)) {
        removeTrack(track.source);
      } else {
        addTrack(track);
      }
    },
    [isTrackFavorite, addTrack, removeTrack],
  );

  const isFavorite = useMemo(() => {
    const favoriteKeys = new Set(
      favoriteTracks.map(
        (favorite) =>
          `${favorite.ref.source.provider}/${favorite.ref.source.id}`,
      ),
    );
    return (track: Track) =>
      favoriteKeys.has(`${track.source.provider}/${track.source.id}`);
  }, [favoriteTracks]);

  return useMemo(
    () => ({
      playNow,
      addNext,
      addToQueue,
      toggleFavorite,
      isFavorite,
    }),
    [playNow, addNext, addToQueue, toggleFavorite, isFavorite],
  );
};
