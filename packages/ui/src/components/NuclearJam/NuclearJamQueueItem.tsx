import { CassetteTape, X } from 'lucide-react';
import { forwardRef } from 'react';

import { pickArtwork, QueueItem } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { Button } from '../Button';

type NuclearJamQueueItemProps = {
  item: QueueItem;
  isCurrent: boolean;
  onRemove?: () => void;
};

export const NuclearJamQueueItem = forwardRef<
  HTMLDivElement,
  NuclearJamQueueItemProps
>(({ item, isCurrent, onRemove }, ref) => {
  const thumbnail = pickArtwork(item.track.artwork, 'thumbnail', 48);
  const artists = item.track.artists.map((artist) => artist.name).join(', ');

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-14 items-center gap-3 rounded-lg px-2 transition-colors',
        isCurrent ? 'bg-primary/10' : 'hover:bg-muted/70',
      )}
      data-testid="jam-queue-item"
      data-is-current={isCurrent}
    >
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {thumbnail?.url ? (
          <img
            src={thumbnail.url}
            alt={item.track.title}
            className="size-full object-cover"
          />
        ) : (
          <CassetteTape
            size={24}
            absoluteStrokeWidth
            className="text-muted-foreground opacity-20"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm leading-5 font-semibold">
          {item.track.title}
        </div>
        {artists && (
          <div className="text-foreground/60 truncate text-xs">{artists}</div>
        )}
      </div>

      {onRemove && (
        <Button
          data-testid="jam-queue-item-remove-button"
          size="icon-sm"
          variant="noShadow"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="shrink-0"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
});

NuclearJamQueueItem.displayName = 'NuclearJamQueueItem';
