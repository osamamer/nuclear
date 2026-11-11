import { CassetteTape } from 'lucide-react';
import { FC } from 'react';

import { pickArtwork, Track } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { formatTimeMillis } from '../../utils/time';

const THUMBNAIL_SIZE = 48;

export type NuclearJamSearchResultTrackProps = {
  track: Track;
  onAdd: (track: Track) => void;
  className?: string;
};

export const NuclearJamSearchResultTrack: FC<
  NuclearJamSearchResultTrackProps
> = ({ track, onAdd, className }) => {
  const thumbnail = pickArtwork(track.artwork, 'thumbnail', THUMBNAIL_SIZE);
  const artists = track.artists.map((artist) => artist.name).join(', ');
  const duration = formatTimeMillis(track.durationMs);

  const handleClick = () => {
    onAdd(track);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'hover:bg-muted/70 active:bg-primary/15 flex h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors',
        className,
      )}
      data-testid="jam-search-result-track"
    >
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {thumbnail?.url ? (
          <img
            src={thumbnail.url}
            alt={track.title}
            className="size-full object-cover"
          />
        ) : (
          <CassetteTape
            size={24}
            absoluteStrokeWidth
            className="text-foreground opacity-20"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm leading-5 font-semibold">
          {track.title}
        </div>
        {artists && (
          <div className="text-foreground/60 truncate text-xs">{artists}</div>
        )}
      </div>

      {duration && (
        <div className="text-foreground/60 shrink-0 text-xs tabular-nums">
          {duration}
        </div>
      )}
    </button>
  );
};
