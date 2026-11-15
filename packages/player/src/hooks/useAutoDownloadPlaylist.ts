import { setSetting, useSettingsStore } from '../stores/settingsStore';

const selectedIdsSetting = 'core.playback.autoDownloadPlaylistIds';

export const useAutoDownloadPlaylist = (playlistId: string) => {
  const selectedIds = useSettingsStore(
    (state) => state.values[selectedIdsSetting],
  );
  const ids = Array.isArray(selectedIds)
    ? selectedIds.filter((id): id is string => typeof id === 'string')
    : [];
  const isSelected = ids.includes(playlistId);

  const toggle = async () => {
    await setSetting(
      selectedIdsSetting,
      isSelected ? ids.filter((id) => id !== playlistId) : [...ids, playlistId],
    );
    if (!isSelected) {
      await setSetting('core.playback.autoDownloadPlaylists', true);
    }
  };

  return { isSelected, toggle };
};
