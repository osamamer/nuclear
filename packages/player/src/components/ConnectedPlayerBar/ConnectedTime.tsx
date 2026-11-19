import { FC } from 'react';

import { PlayerBar } from '@nuclearplayer/ui';

import { useSoundStore } from '../../stores/soundStore';

const toSafeSeconds = (value: number) => (Number.isFinite(value) ? value : 0);

export const ConnectedElapsedTime: FC = () => {
  const seek = useSoundStore((state) => state.seek);
  return (
    <PlayerBar.Time
      side="left"
      seconds={toSafeSeconds(seek)}
      data-testid="player-elapsed-time"
    />
  );
};

export const ConnectedTotalTime: FC = () => {
  const duration = useSoundStore((state) => state.duration);
  return (
    <PlayerBar.Time
      side="right"
      seconds={toSafeSeconds(duration)}
      data-testid="player-total-time"
    />
  );
};
