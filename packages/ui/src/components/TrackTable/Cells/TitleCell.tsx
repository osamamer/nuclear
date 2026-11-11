import { CellContext } from '@tanstack/react-table';
import { DiscIcon, EllipsisVertical, Plus, Volume2 } from 'lucide-react';
import { FC, forwardRef } from 'react';

import { pickArtwork, Track } from '@nuclearplayer/model';

import { Button } from '../../Button';
import { useTrackTableContext } from '../TrackTableContext';
import { ContextMenuWrapperProps } from '../types';

type TitleCellMeta = {
  displayQueueControls?: boolean;
  displayThumbnail?: boolean;
  displayArtist?: boolean;
  activeTrackKey?: string;
  onAddToQueue?: (track: Track) => void;
  ContextMenuWrapper?: FC<ContextMenuWrapperProps>;
};

type AddToQueueButtonProps = {
  label: string;
  onClick: () => void;
};

const AddToQueueButton: FC<AddToQueueButtonProps> = ({ label, onClick }) => (
  <Button
    data-testid="add-to-queue-button"
    size="icon-sm"
    variant="text"
    className="opacity-0 transition-none group-hover:opacity-100"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
  >
    <Plus size={16} />
  </Button>
);

type ContextMenuButtonProps = {
  label: string;
};

const ContextMenuButton = forwardRef<HTMLElement, ContextMenuButtonProps>(
  function ContextMenuButton({ label, ...props }, ref) {
    return (
      <Button
        {...props}
        ref={ref}
        data-testid="track-context-menu-button"
        size="icon-sm"
        variant="text"
        className="opacity-0 transition-none group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
      >
        <EllipsisVertical size={16} />
      </Button>
    );
  },
);

export const TitleCell = <T extends Track>({
  getValue,
  row,
  table,
}: CellContext<T, string | number | undefined>) => {
  const meta = table.options.meta as TitleCellMeta | undefined;
  const { actions, labels } = useTrackTableContext<T>();
  const showControls = meta?.displayQueueControls;
  const ContextMenuWrapper = meta?.ContextMenuWrapper;
  const track = row.original;
  const trackKey = `${track.source.provider}/${track.source.id}`;
  const isActiveTrack = meta?.activeTrackKey === trackKey;
  const artwork = meta?.displayThumbnail
    ? pickArtwork(track.artwork, 'thumbnail', 64)
    : undefined;
  const artists = meta?.displayArtist
    ? track.artists.map((artist) => artist.name).join(', ')
    : '';
  const hasAddToQueue = Boolean(meta?.onAddToQueue);
  const hasContextMenu = Boolean(ContextMenuWrapper);
  const hasActions = hasAddToQueue || hasContextMenu;

  return (
    <td className="min-w-0 px-2">
      <div className="flex min-w-0 items-center gap-3">
        {meta?.displayThumbnail && (
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
            {artwork?.url ? (
              <img
                src={artwork.url}
                alt={track.title}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <DiscIcon size={20} className="text-foreground/30" />
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {isActiveTrack && (
              <Volume2
                size={14}
                aria-hidden="true"
                data-testid="now-playing-indicator"
                className="text-primary shrink-0"
              />
            )}
            <button
              className="min-w-0 cursor-pointer truncate text-left text-sm leading-5 font-semibold hover:underline"
              aria-current={isActiveTrack ? 'true' : undefined}
              aria-label={
                isActiveTrack && labels.nowPlaying
                  ? `${getValue()} — ${labels.nowPlaying}`
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                actions.onPlayNow?.(track);
              }}
            >
              {getValue()}
            </button>
          </div>
          {artists && (
            <span className="text-foreground/60 truncate text-xs leading-4">
              {artists}
            </span>
          )}
        </div>
        {showControls && hasActions && (
          <div className="flex shrink-0 items-center gap-1">
            {hasAddToQueue && (
              <AddToQueueButton
                label={labels.addToQueue}
                onClick={() => meta?.onAddToQueue?.(track)}
              />
            )}
            {ContextMenuWrapper && (
              <ContextMenuWrapper track={track}>
                <ContextMenuButton label={labels.trackOptions} />
              </ContextMenuWrapper>
            )}
          </div>
        )}
      </div>
    </td>
  );
};
