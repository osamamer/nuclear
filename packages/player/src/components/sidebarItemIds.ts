export const SIDEBAR_ITEM_IDS = {
  playlists: 'playlists',
  dashboard: 'dashboard',
  discover: 'discover',
  favoriteAlbums: 'favorite-albums',
  favoriteTracks: 'favorite-tracks',
  favoriteArtists: 'favorite-artists',
  history: 'history',
  sources: 'sources',
  settings: 'settings',
} as const;

export const customSidebarItemId = (pluginId: string, viewId: string) =>
  `plugin:${pluginId}/${viewId}`;
