import { FC } from 'react';

import { PlayerBar } from '@nuclearplayer/ui';

import { ConnectedControls } from './ConnectedControls';
import { ConnectedNowPlaying } from './ConnectedNowPlaying';
import { ConnectedSeekBar } from './ConnectedSeekBar';
import { ConnectedVolume } from './ConnectedVolume';

export const ConnectedPlayerBar: FC = () => {
  return (
    <PlayerBar
      seekBar={<ConnectedSeekBar />}
      left={<ConnectedNowPlaying />}
      center={<ConnectedControls />}
      right={<ConnectedVolume />}
    />
  );
};
