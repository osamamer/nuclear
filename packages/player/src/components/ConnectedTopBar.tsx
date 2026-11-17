import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, TopBar, TopBarNavigation } from '@nuclearplayer/ui';

import { useCanGoForward } from '../hooks/useCanGoForward';
import { useFramelessWindow } from '../hooks/useFramelessWindow';
import { useLayoutStore } from '../stores/layoutStore';
import { useIsLightProfile } from '../stores/lightProfileStore';
import { ConnectedThemeController } from './ConnectedThemeController';
import { JamQrCodeButton } from './JamQrCodeButton';
import { PlaylistDownloadStatus } from './PlaylistDownloadStatus';
import { SearchBox } from './SearchBox';
import { UpdateBadge } from './UpdateBadge';

export const ConnectedTopBar: FC = () => {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const canGoForward = useCanGoForward();
  const frameless = useFramelessWindow();
  const isHidden = useLayoutStore((state) => state.rightSidebar.isHidden);
  const toggleVisibility = useLayoutStore(
    (state) => state.toggleRightSidebarVisibility,
  );
  const { t } = useTranslation('queue');
  const isLight = useIsLightProfile();

  return (
    <TopBar draggable={frameless}>
      <div className="flex flex-row items-center gap-4">
        <TopBarNavigation
          onBack={() => router.history.back()}
          onForward={() => router.history.forward()}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
        {!isLight && <UpdateBadge />}
      </div>
      {isLight ? <div /> : <SearchBox />}
      <div className="flex flex-row items-center justify-end gap-2">
        {!isLight && <PlaylistDownloadStatus />}
        {!isLight && <JamQrCodeButton />}
        <Button
          size="icon-sm"
          variant="text"
          aria-label={t(isHidden ? 'actions.showPanel' : 'actions.hidePanel')}
          title={t(isHidden ? 'actions.showPanel' : 'actions.hidePanel')}
          data-testid="toggle-queue-panel-button"
          onClick={toggleVisibility}
        >
          {isHidden ? <PanelRightOpen /> : <PanelRightClose />}
        </Button>
        <ConnectedThemeController />
      </div>
    </TopBar>
  );
};
