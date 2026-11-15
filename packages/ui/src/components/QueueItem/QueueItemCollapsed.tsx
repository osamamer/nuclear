import { CassetteTape } from 'lucide-react';
import { FC } from 'react';

import { pickArtwork } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { MovingEqualizer } from '../MovingEqualizer';
import type { QueueItemProps } from './types';
import { queueItemVariants } from './variants';

export const QueueItemCollapsed: FC<QueueItemProps> = ({
  track,
  status = 'idle',
  isCurrent = false,
  isPaused = false,
  onSelect,
  classes,
}) => {
  const thumbnail = pickArtwork(track.artwork, 'thumbnail', 64);

  return (
    <div className="relative" data-testid="queue-item">
      <div
        className={cn(
          queueItemVariants({ status, isCurrent, isCollapsed: true }),
          classes?.root,
        )}
        onClick={onSelect}
        role={onSelect ? 'button' : undefined}
      >
        {thumbnail?.url ? (
          <img
            src={thumbnail.url}
            alt={track.title}
            className={cn('h-full w-full object-cover', classes?.thumbnail)}
          />
        ) : (
          <CassetteTape size={20} className="opacity-20" />
        )}
        {isCurrent && (
          <div
            data-testid="queue-item-playing-indicator"
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"
          >
            <MovingEqualizer size="md" isPaused={isPaused} />
          </div>
        )}

        {status === 'loading' && (
          <div
            data-testid="queue-item-loading"
            className="bg-stripes-diagonal absolute inset-x-0 bottom-0 h-1"
          />
        )}
      </div>
    </div>
  );
};
