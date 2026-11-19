import { ComponentPropsWithoutRef, forwardRef } from 'react';

import type {
  LyricsSegment,
  SyncedLyricsLine as SyncedLyricsLineModel,
} from '@nuclearplayer/model';

import { cn } from '../../../utils';
import { LyricsAnnotations, LyricsBackgroundVocals } from '../LyricsLineParts';
import { getLyricsDirection, getTimingState } from '../utils';

export type SyncedLyricsLineShellProps = ComponentPropsWithoutRef<'button'> & {
  line: SyncedLyricsLineModel<LyricsSegment>;
  positionMs: number;
};

export const SyncedLyricsLineShell = forwardRef<
  HTMLButtonElement,
  SyncedLyricsLineShellProps
>(function SyncedLyricsLineShell(
  { line, positionMs, className, children, ...props },
  ref,
) {
  const { isPast, isActive } = getTimingState(line, positionMs);

  return (
    <button
      ref={ref}
      type="button"
      data-testid="lyrics-line"
      data-active={isActive}
      dir={getLyricsDirection(
        line.segments.map((segment) => segment.text).join(''),
      )}
      className={cn(
        'font-lyrics rtl:font-lyrics-arabic text-foreground/60 hover:text-foreground block w-full cursor-pointer py-1 text-start tracking-tight transition-colors duration-100 rtl:tracking-normal',
        isPast && 'text-foreground/40',
        isActive && 'text-foreground',
        className,
      )}
      {...props}
    >
      <span className="block">
        {children}
        {line.background && (
          <LyricsBackgroundVocals segments={line.background} />
        )}
      </span>
      {line.annotations && <LyricsAnnotations annotations={line.annotations} />}
    </button>
  );
});
