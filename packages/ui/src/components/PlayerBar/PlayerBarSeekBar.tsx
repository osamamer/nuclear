import { FC } from 'react';

import { cn } from '../../utils';
import { useSeekBar } from './useSeekBar';

export type PlayerSeekBarProps = {
  progress: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  isLoading?: boolean;
  onSeek?: (percent: number) => void;
  className?: string;
};

export const PlayerBarSeekBar: FC<PlayerSeekBarProps> = ({
  progress,
  isLoading = false,
  onSeek,
  className = '',
}) => {
  const { clamped, containerRef, handleClick, isInteractive } = useSeekBar({
    progress,
    isLoading,
    onSeek,
  });

  return (
    <div className={cn('w-full px-4 select-none', className)}>
      <div
        ref={containerRef}
        data-testid="player-seek-bar"
        className={cn('group relative h-4 w-full', {
          'pointer-events-none cursor-not-allowed': isLoading,
          'cursor-pointer': isInteractive,
        })}
        onClick={handleClick}
        aria-disabled={isLoading}
      >
        <div className="surface-seekbar-track absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full">
          {isLoading && (
            <div className="bg-stripes-diagonal absolute inset-0 opacity-70" />
          )}
          {!isLoading && (
            <div
              className="surface-seekbar h-full rounded-full transition-[width] duration-150"
              style={{ width: `${clamped}%` }}
            />
          )}
        </div>
        {!isLoading && (
          <div
            className="surface-seekbar border-background shadow-shadow pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
};
