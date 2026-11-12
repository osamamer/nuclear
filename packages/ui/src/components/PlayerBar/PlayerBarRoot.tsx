import { FC, ReactNode } from 'react';

import { BottomBar } from '..';
import { cn } from '../../utils';

export type PlayerBarRootProps = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  seekBar?: ReactNode;
  className?: string;
};
export const PlayerBarRoot: FC<PlayerBarRootProps> = ({
  left,
  center,
  right,
  seekBar,
  className = '',
}) => (
  <BottomBar
    className={cn('px-4', seekBar && 'relative border-t-0', className)}
  >
    {seekBar && (
      <div className="absolute inset-x-0 top-0 z-10 -translate-y-1/2">
        {seekBar}
      </div>
    )}
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
      {left && <div className="min-w-0">{left}</div>}
      {center && <div className="justify-self-center">{center}</div>}
      {right && <div className="justify-self-end">{right}</div>}
    </div>
  </BottomBar>
);
