import { useTranslation } from '@nuclearplayer/i18n';

import { useFetchedTracksActions } from '../../../hooks/useFetchedTracksActions';
import { sortPlaylistItems } from '../../../services/sortPlaylistItems';
import { usePlaylistPreferencesStore } from '../../../stores/playlistPreferencesStore';
import { usePlaylistStore } from '../../../stores/playlistStore';

export const usePlaylistQueueActions = (playlistId: string) => {
  const { t } = useTranslation();
  const loadPlaylist = usePlaylistStore((state) => state.loadPlaylist);
  const trackSortBy = usePlaylistPreferencesStore(
    (state) => state.trackSortByPlaylist[playlistId] ?? 'playlistOrder',
  );

  const loadTracks = async () => {
    const playlist = await loadPlaylist(playlistId);
    if (!playlist) {
      return [];
    }
    return sortPlaylistItems(playlist.items, trackSortBy).map(
      (item) => item.track,
    );
  };

  return useFetchedTracksActions(
    loadTracks,
    {
      scope: 'playlists',
      message: t('album:errors.failedToLoadTracks'),
    },
    playlistId,
  );
};
