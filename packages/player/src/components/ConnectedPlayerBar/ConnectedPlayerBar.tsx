import { Link } from '@tanstack/react-router';
import { MicVocalIcon } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { PlayerBar, Tooltip } from '@nuclearplayer/ui';

import { useIsLightProfile } from '../../stores/lightProfileStore';
import { ConnectedControls } from './ConnectedControls';
import { ConnectedNowPlaying } from './ConnectedNowPlaying';
import { ConnectedSeekBar } from './ConnectedSeekBar';
import { ConnectedElapsedTime, ConnectedTotalTime } from './ConnectedTime';
import { ConnectedVolume } from './ConnectedVolume';

export const ConnectedPlayerBar: FC = () => {
  const { t } = useTranslation('navigation');
  const isLight = useIsLightProfile();

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
                to="/lyrics"
                aria-label={t('lyrics')}
                className="text-foreground hover:bg-primary/10 aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <MicVocalIcon size={16} />
              </Link>
            </Tooltip>
          )}
          <ConnectedVolume />
        </div>
      }
    />
  );
};
