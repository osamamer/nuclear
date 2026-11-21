import {
  Link,
  useCanGoBack,
  useMatchRoute,
  useRouter,
} from '@tanstack/react-router';
import { ListMusicIcon, MicVocalIcon } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, PlayerBar, Tooltip } from '@nuclearplayer/ui';

import { useLayoutStore } from '../../stores/layoutStore';
import { useIsLightProfile } from '../../stores/lightProfileStore';
import { ConnectedControls } from './ConnectedControls';
import { ConnectedNowPlaying } from './ConnectedNowPlaying';
import { ConnectedSeekBar } from './ConnectedSeekBar';
import { ConnectedElapsedTime, ConnectedTotalTime } from './ConnectedTime';
import { ConnectedVolume } from './ConnectedVolume';

export const ConnectedPlayerBar: FC = () => {
  const { t } = useTranslation('navigation');
  const { t: tQueue } = useTranslation('queue');
  const isLight = useIsLightProfile();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const matchRoute = useMatchRoute();
  const lyricsOpen = Boolean(matchRoute({ to: '/lyrics' }));
  const isQueueHidden = useLayoutStore((state) => state.rightSidebar.isHidden);
  const toggleQueueVisibility = useLayoutStore(
    (state) => state.toggleRightSidebarVisibility,
  );
  const queueLabel = tQueue(
    isQueueHidden ? 'actions.showPanel' : 'actions.hidePanel',
  );

  return (
    <PlayerBar
      seekBar={<ConnectedSeekBar />}
      left={<ConnectedNowPlaying />}
      center={
        <div className="flex items-center gap-3">
          <ConnectedElapsedTime />
          <ConnectedControls />
          <ConnectedTotalTime />
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          {!isLight && (
            <Tooltip content={t('lyrics')} side="top">
              <Link
                to={lyricsOpen && !canGoBack ? '/' : '/lyrics'}
                replace={lyricsOpen && !canGoBack}
                onClick={(event) => {
                  if (
                    lyricsOpen &&
                    canGoBack &&
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault();
                    router.history.back();
                  }
                }}
                aria-label={t('lyrics')}
                className="text-foreground hover:bg-primary/10 aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <MicVocalIcon size={16} />
              </Link>
            </Tooltip>
          )}
          <Tooltip content={queueLabel} side="top">
            <Button
              size="icon-sm"
              variant="text"
              aria-label={queueLabel}
              aria-expanded={!isQueueHidden}
              className="aria-expanded:bg-primary/10 aria-expanded:text-primary"
              data-testid="toggle-queue-panel-button"
              onClick={toggleQueueVisibility}
            >
              <ListMusicIcon size={16} />
            </Button>
          </Tooltip>
          <ConnectedVolume />
        </div>
      }
    />
  );
};
