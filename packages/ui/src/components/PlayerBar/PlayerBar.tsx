import { FC } from 'react';

import { PlayerBarControls } from './PlayerBarControls';
import { PlayerBarNowPlaying } from './PlayerBarNowPlaying';
import { PlayerBarRoot, PlayerBarRootProps } from './PlayerBarRoot';
import { PlayerBarSeekBar } from './PlayerBarSeekBar';
import { PlayerBarTime } from './PlayerBarTime';
import { PlayerBarVolume } from './PlayerBarVolume';

type PlayerBarProps = PlayerBarRootProps;

type PlayerBarComponent = FC<PlayerBarProps> & {
  NowPlaying: typeof PlayerBarNowPlaying;
  Controls: typeof PlayerBarControls;
  Volume: typeof PlayerBarVolume;
  SeekBar: typeof PlayerBarSeekBar;
  Time: typeof PlayerBarTime;
};

const PlayerBarImpl: FC<PlayerBarProps> = ({
  left,
  center,
  right,
  seekBar,
  className = '',
}) => {
  return (
    <PlayerBarRoot
      className={className}
      left={left}
      center={center}
      right={right}
      seekBar={seekBar}
    />
  );
};

export const PlayerBar = PlayerBarImpl as PlayerBarComponent;
PlayerBar.NowPlaying = PlayerBarNowPlaying;
PlayerBar.Controls = PlayerBarControls;
PlayerBar.Volume = PlayerBarVolume;
PlayerBar.SeekBar = PlayerBarSeekBar;
PlayerBar.Time = PlayerBarTime;
