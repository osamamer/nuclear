import { createRootRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  CableIcon,
  DiscIcon,
  GaugeIcon,
  HistoryIcon,
  ListMusicIcon,
  MicVocalIcon,
  MusicIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  PlayerShell,
  PlayerWorkspace,
  RouteTransition,
  SidebarNavigation,
  SidebarNavigationItem,
  Toaster,
} from '@nuclearplayer/ui';

import { ConnectedPlayerBar } from '../components/ConnectedPlayerBar';
import {
  ConnectedQueuePanel,
  QueueHeaderActions,
} from '../components/ConnectedQueuePanel';
import { ConnectedSettingsModal } from '../components/ConnectedSettingsModal';
import { ConnectedStreamVerification } from '../components/ConnectedStreamVerification';
import { ConnectedTitleBar } from '../components/ConnectedTitleBar';
import { ConnectedTopBar } from '../components/ConnectedTopBar';
import { CustomViewSidebarEntries } from '../components/CustomViewSidebarEntries';
import { DevTools } from '../components/DevTools';
import { FlatpakWarningBanner } from '../components/FlatpakWarningBanner';
import { PlaylistSidebarEntries } from '../components/PlaylistSidebarEntries';
import { SIDEBAR_ITEM_IDS } from '../components/sidebarItemIds';
import { SidebarNavigationVisibilityMenu } from '../components/SidebarNavigationVisibilityMenu';
import { SoundProvider } from '../components/SoundProvider';
import { StreamResolver } from '../components/StreamResolver';
import { GlobalShortcuts } from '../shortcuts';
import { useLayoutStore } from '../stores/layoutStore';
import { useSettingsModalStore } from '../stores/settingsModalStore';
import { useSkipFeedbackStore } from '../stores/skipFeedbackStore';
import { useStartupStore } from '../stores/startupStore';

const RootComponent = () => {
  const { t } = useTranslation('navigation');
  const { t: tPrefs } = useTranslation('preferences');
  const {
    leftSidebar,
    rightSidebar,
    hiddenSidebarItems,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebarWidth,
    setRightSidebarWidth,
  } = useLayoutStore();
  const openSettings = useSettingsModalStore((state) => state.open);
  const isStartingUp = useStartupStore((state) => state.isStartingUp);
  const refusalSequence = useSkipFeedbackStore((state) => state.sequence);
  const hasOneMoreRefusal = useSkipFeedbackStore(
    (state) => state.hasOneMoreRefusal,
  );
  const [isRefusalShaking, setIsRefusalShaking] = useState(false);
  const sidebarItems = [
    {
      id: SIDEBAR_ITEM_IDS.playlists,
      to: '/playlists',
      icon: <ListMusicIcon />,
      label: t('playlists'),
      isFeatured: true,
    },
    {
      id: SIDEBAR_ITEM_IDS.dashboard,
      to: '/dashboard',
      icon: <GaugeIcon />,
      label: t('dashboard'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.favoriteAlbums,
      to: '/favorites/albums',
      icon: <DiscIcon />,
      label: t('favoriteAlbums'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.favoriteTracks,
      to: '/favorites/tracks',
      icon: <MusicIcon />,
      label: t('favoriteTracks'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.favoriteArtists,
      to: '/favorites/artists',
      icon: <UserIcon />,
      label: t('favoriteArtists'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.history,
      to: '/history',
      icon: <HistoryIcon />,
      label: t('history'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.lyrics,
      to: '/lyrics',
      icon: <MicVocalIcon />,
      label: t('lyrics'),
      isFeatured: false,
    },
    {
      id: SIDEBAR_ITEM_IDS.sources,
      to: '/sources',
      icon: <CableIcon />,
      label: t('sources'),
      isFeatured: false,
    },
  ];
  const isSidebarItemVisible = (id: string) => !hiddenSidebarItems.includes(id);

  useEffect(() => {
    if (refusalSequence === 0) {
      return;
    }

    setIsRefusalShaking(false);
    const frameId = requestAnimationFrame(() => setIsRefusalShaking(true));
    const timeoutId = window.setTimeout(() => setIsRefusalShaking(false), 360);
    toast.warning(
      tPrefs(
        hasOneMoreRefusal
          ? 'blacklist.refusal.oneMore'
          : 'blacklist.refusal.last',
      ),
    );

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [hasOneMoreRefusal, refusalSequence, tPrefs]);
  useEffect(() => {
    const window = getCurrentWindow();
    window.show().then(() => window.setFocus());
  }, []);
  return (
    <PlayerShell
      className={isRefusalShaking ? 'blacklist-refusal-shake' : undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GlobalShortcuts />
      <div>
        <ConnectedTitleBar />
        <FlatpakWarningBanner />
        <ConnectedTopBar />
      </div>
      {!isStartingUp && <StreamResolver />}
      <SoundProvider>
        <PlayerWorkspace>
          <PlayerWorkspace.LeftSidebar
            width={leftSidebar.width}
            isCollapsed={leftSidebar.isCollapsed}
            onWidthChange={setLeftSidebarWidth}
            onToggle={toggleLeftSidebar}
          >
            <SidebarNavigation isCompact={leftSidebar.isCollapsed}>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {sidebarItems
                    .filter((item) => isSidebarItemVisible(item.id))
                    .map((item) => (
                      <div key={item.id} className="contents">
                        <SidebarNavigationItem
                          to={item.to}
                          icon={item.icon}
                          label={item.label}
                          isFeatured={item.isFeatured}
                          exact={item.id === SIDEBAR_ITEM_IDS.playlists}
                        />
                        {item.id === SIDEBAR_ITEM_IDS.playlists &&
                          !leftSidebar.isCollapsed && (
                            <PlaylistSidebarEntries />
                          )}
                      </div>
                    ))}
                  <CustomViewSidebarEntries />
                </div>
                <div className="border-foreground/10 mt-auto flex flex-col gap-1 border-t pt-2">
                  {isSidebarItemVisible(SIDEBAR_ITEM_IDS.settings) && (
                    <SidebarNavigationItem
                      icon={<SettingsIcon />}
                      label={tPrefs('title')}
                      onClick={() => openSettings()}
                    />
                  )}
                  <SidebarNavigationVisibilityMenu
                    isCompact={leftSidebar.isCollapsed}
                    builtInItems={sidebarItems.map(({ id, label, icon }) => ({
                      id,
                      label,
                      icon,
                    }))}
                  />
                </div>
              </div>
            </SidebarNavigation>
          </PlayerWorkspace.LeftSidebar>

          <PlayerWorkspace.Main>
            <RouteTransition />
          </PlayerWorkspace.Main>

          <PlayerWorkspace.RightSidebar
            width={rightSidebar.width}
            isCollapsed={rightSidebar.isCollapsed}
            onWidthChange={setRightSidebarWidth}
            onToggle={toggleRightSidebar}
            headerActions={<QueueHeaderActions />}
            footer={<ConnectedStreamVerification />}
          >
            <ConnectedQueuePanel isCollapsed={rightSidebar.isCollapsed} />
          </PlayerWorkspace.RightSidebar>
        </PlayerWorkspace>
      </SoundProvider>

      <ConnectedPlayerBar />
      <Toaster />
      <ConnectedSettingsModal />
      <DevTools />
    </PlayerShell>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
