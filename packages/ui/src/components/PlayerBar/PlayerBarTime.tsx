import { FC } from 'react';

import { cn } from '../../utils';
import { formatTimeSeconds } from '../../utils/time';

export type PlayerBarTimeProps = {
  seconds?: number;
  side?: 'left' | 'right';
  className?: string;
  'data-testid'?: string;
};

export const PlayerBarTime: FC<PlayerBarTimeProps> = ({
  seconds,
  side = 'left',
  className,
  'data-testid': testId = 'player-bar-time',
}) => (
  <span
    data-testid={testId}
    className={cn(
      'text-muted-foreground w-12 text-xs tabular-nums select-none',
      side === 'right' ? 'text-left' : 'text-right',
      className,
    )}
  >
    {formatTimeSeconds(Math.max(0, Math.floor(seconds ?? 0)))}
  </span>
);
