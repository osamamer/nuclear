import { ComponentProps, FC, RefObject, useMemo } from 'react';

import type {
  LineSyncedLyrics,
  LyricsSegment,
  SyncedLyricsLine as SyncedLyricsLineModel,
  TimedLyricsSegment,
  WordSyncedLyrics,
} from '@nuclearplayer/model';

import { cn } from '../../../utils';
import { flattenLines } from '../utils';
import { CurrentLinePill } from './CurrentLinePill';
import { SyncedLyricsLines } from './SyncedLyricsLines';
import { useSyncedLyrics } from './useSyncedLyrics';

type SyncedLyricsLine =
  | SyncedLyricsLineModel<LyricsSegment>
  | SyncedLyricsLineModel<TimedLyricsSegment>;

type SyncedLyricsLabels = {
  currentLine: string;
};

type SyncedLyricsProps = Omit<ComponentProps<'div'>, 'children'> & {
  lyrics: LineSyncedLyrics | WordSyncedLyrics;
  positionMs: number;
  onSeek: (positionMs: number) => void;
  labels: SyncedLyricsLabels;
  viewportRef: RefObject<HTMLDivElement>;
  autoScroll: boolean;
};

export const SyncedLyrics: FC<SyncedLyricsProps> = ({
  lyrics,
  positionMs,
  onSeek,
  labels,
  viewportRef,
  autoScroll,
  className,
  ...props
}) => {
  const lines = useMemo(
    () => flattenLines(lyrics.sections) as SyncedLyricsLine[],
    [lyrics.sections],
  );
  const {
    activeLineRef,
    activeLineIndex,
    activeLineDirection,
    scrollToActiveLine,
  } = useSyncedLyrics({ lines, positionMs, viewportRef, autoScroll });

  return (
    <div
      className={cn(
        'font-heading contents leading-tight font-bold tracking-tight font-stretch-semi-condensed',
        className,
      )}
      {...props}
    >
      <div className="h-2/10 shrink-0" />
      <SyncedLyricsLines
        lyricsType={lyrics.type}
        lines={lines}
        positionMs={positionMs}
        activeLineIndex={activeLineIndex}
        activeLineRef={activeLineRef}
        onLineClick={onSeek}
      />
      <div className="h-8/10 shrink-0" />
      {activeLineDirection && (
        <CurrentLinePill
          direction={activeLineDirection}
          label={labels.currentLine}
          onClick={scrollToActiveLine}
        />
      )}
    </div>
  );
};
