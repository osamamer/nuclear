import { AlertCircle, CassetteTape, X } from 'lucide-react';
import { FC } from 'react';

import { pickArtwork } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { formatTimeMillis } from '../../utils/time';
import { Button } from '../Button';
import type { QueueItemProps } from './types';
import { queueItemVariants } from './variants';

export const QueueItemExpanded: FC<QueueItemProps> = ({
  track,
  status = 'idle',
  isCurrent = false,
  onSelect,
  onRemove,
  labels,
  classes,
}) => {
  const thumbnail = pickArtwork(track.artwork, 'thumbnail', 48);
  const duration = formatTimeMillis(track.durationMs);
  const artists = track.artists.map((artist) => artist.name).join(', ');

  return (
    <div
      data-testid="queue-item"
      data-is-current={isCurrent}
      className={cn(
        'group',
        queueItemVariants({ status, isCurrent, isCollapsed: false }),
        classes?.root,
      )}
      onClick={onSelect}
      onDoubleClick={onSelect}
      role={onSelect ? 'button' : undefined}
    >
      {status === 'error' && (
        <div className="surface-accent-red absolute top-0 right-0 bottom-0 left-0 w-2 border-0" />
      )}
      <div
        data-testid="queue-item-thumbnail"
        className={cn(
          'bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md',
          classes?.thumbnail,
        )}
      >
        {thumbnail?.url ? (
          <img
            src={thumbnail.url}
            alt={track.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <CassetteTape size={24} absoluteStrokeWidth className="opacity-25" />
        )}
      </div>

      <div className={cn('min-w-0 flex-1', classes?.content)}>
        <div
          data-testid="queue-item-title"
          className={cn(
            'truncate text-sm leading-5 font-semibold',
            classes?.title,
          )}
        >
          {track.title}
        </div>
        <div
          data-testid="queue-item-artist"
          className={cn('text-foreground/60 truncate text-xs', classes?.artist)}
        >
          {artists}
        </div>
        {status === 'error' && (
          <div
            data-testid="queue-item-error"
            className={cn(
              'surface-accent-red border-border mt-1 inline-flex max-w-full items-center gap-1 rounded-sm border px-1 py-0.5 text-xs',
              classes?.error,
            )}
          >
            <AlertCircle size={12} />
            <span className="truncate">{labels.playbackError}</span>
          </div>
        )}
      </div>

      <div className="relative flex shrink-0 items-center justify-start">
        {duration && (
          <div
            data-testid="queue-item-duration"
            className={cn(
              'text-foreground/55 mr-3 text-xs tabular-nums',
              classes?.duration,
            )}
          >
            {duration}
          </div>
        )}

        {onRemove && (
          <Button
            data-testid="queue-item-remove-button"
            size="icon-sm"
            variant="text"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={labels?.removeButton}
            className={cn(
              'absolute right-2 opacity-0 group-hover:opacity-100',
              classes?.removeButton,
            )}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {status === 'loading' && (
        <div
          data-testid="queue-item-loading"
          className="bg-stripes-diagonal absolute inset-x-0 bottom-0 h-1"
        />
      )}
    </div>
  );
};
