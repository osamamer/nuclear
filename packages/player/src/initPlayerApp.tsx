import React from 'react';

import type { Playlist } from '@nuclearplayer/model';

import App from './App';
import { initLogStream } from './hooks/useLogStream';
import { applyAccentColor } from './services/accentColor';
import { applyThemeFromSettingsIfAny } from './services/advancedThemeService';
import { startAdvancedThemeWatcher } from './services/advancedThemeWatcher';
import { initAppIconSync } from './services/appIcon';
import { initBridgeHandler } from './services/bridge/bridgeHandler';
import { registerBuiltInCoreSettings } from './services/coreSettings';
import { initDiscordHandler } from './services/discordHandler';
import { initDiscoveryService } from './services/discoveryService';
import { startPlaylistDownloadService } from './services/downloads/playlistDownloadService';
import { initHistoryService } from './services/history';
import { initHttpApiHandler } from './services/httpApi';
import {
  applyLanguageFromSettings,
  initLanguageWatcher,
} from './services/languageService';
import {
  initializeLightProfile,
  showOnlyPlaylists,
} from './services/lightProfile';
import { loadMarketplaceThemes } from './services/marketplaceThemeDirService';
import { initMcpHandler } from './services/mcp';
import { initMpdHandler } from './services/mpd';
import { initPlaybackEventBridge } from './services/playbackEventBridge';
import { hydratePluginsFromRegistry } from './services/plugins/pluginBootstrap';
import { initializeBlacklistStore } from './stores/blacklistStore';
import { initializeFavoritesStore } from './stores/favoritesStore';
import { initializePlaylistStore } from './stores/playlistStore';
import {
  initializeQueueStore,
  startBlacklistScheduleEnforcement,
} from './stores/queueStore';
import { getSetting, initializeSettingsStore } from './stores/settingsStore';
import { initializeShortcutsStore } from './stores/shortcutsStore';
import { initializeStreamVerificationStore } from './stores/streamVerificationStore';
import { hydrateThemeStore } from './stores/themeStore';
import { useUpdaterStore } from './stores/updaterStore';

const initializeStores = (lightPlaylists: Playlist[] | null) =>
  initializeSettingsStore()
    .then(() => initializeShortcutsStore())
    .then(() => initializeBlacklistStore())
    .then(() => initializeQueueStore())
    .then(() => startBlacklistScheduleEnforcement())
    .then(() => initializeFavoritesStore())
    .then(() => initializeStreamVerificationStore())
    .then(() =>
      lightPlaylists
        ? showOnlyPlaylists(lightPlaylists)
        : initializePlaylistStore(),
    );

const initRemoteControl = () =>
  initMcpHandler()
    .then(() => initMpdHandler())
    .then(() => initHttpApiHandler())
    .then(() => initBridgeHandler());

const initLanguage = () =>
  applyLanguageFromSettings().then(() => initLanguageWatcher());

const applyDarkModeFromSettings = () => {
  const isDark = (getSetting('core.theme.dark') as boolean | undefined) ?? true;
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  document.documentElement.style.removeProperty('background-color');
};

const initThemes = () =>
  Promise.resolve(applyDarkModeFromSettings())
    .then(() => startAdvancedThemeWatcher())
    .then(() => loadMarketplaceThemes())
    .then(() => hydrateThemeStore())
    .then(() => applyThemeFromSettingsIfAny())
    .then(() =>
      applyAccentColor(
        getSetting('core.appearance.accentColor') as string,
        getSetting('core.appearance.customAccentColor') as string,
      ),
    );

const startBackgroundTasks = (isLight: boolean) => {
  if (isLight) {
    void hydratePluginsFromRegistry();
    return;
  }
  void hydratePluginsFromRegistry().then(
    startPlaylistDownloadService,
    startPlaylistDownloadService,
  );
  void useUpdaterStore.getState().checkForUpdate();
};

export const initPlayerApp = async (
  root: ReturnType<typeof import('react-dom/client').createRoot>,
) => {
  initLogStream();

  const lightPlaylists = await initializeLightProfile();
  const isLight = lightPlaylists !== null;

  await initializeStores(lightPlaylists)
    .then(() => registerBuiltInCoreSettings())
    .then(() => initDiscoveryService())
    .then(() => (isLight ? undefined : initRemoteControl()))
    .then(() => (isLight ? undefined : initDiscordHandler()))
    .then(() => initPlaybackEventBridge())
    .then(() => initHistoryService())
    .then(() => initLanguage())
    .then(() => initThemes())
    .then(() => startBackgroundTasks(isLight))
    .then(() => initAppIconSync());

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};
