import { FC } from 'react';

import { PlayerBar } from '@nuclearplayer/ui';

import { ConnectedControls } from './ConnectedControls';
import { ConnectedNowPlaying } from './ConnectedNowPlaying';
import { ConnectedSeekBar } from './ConnectedSeekBar';
import { ConnectedElapsedTime, ConnectedTotalTime } from './ConnectedTime';
import { ConnectedVolume } from './ConnectedVolume';

export const ConnectedPlayerBar: FC = () => {
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
      right={<ConnectedVolume />}
    />
  );
};
