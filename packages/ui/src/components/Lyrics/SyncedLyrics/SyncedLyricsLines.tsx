import { FC, Fragment, RefObject } from 'react';

import type {
  LyricsSegment,
  SyncedLyricsLine as SyncedLyricsLineModel,
  TimedLyricsSegment,
} from '@nuclearplayer/model';

import { InstrumentalBreak } from '../InstrumentalBreak';
import {
  LineSyncedLyricsLine,
  WordSyncedLyricsLine,
} from '../SyncedLyricsLine';
import { getBreakBefore } from '../utils';

type SyncedLyricsLinesProps = {
  lyricsType: 'lineSynced' | 'wordSynced';
  lines: (
    | SyncedLyricsLineModel<LyricsSegment>
    | SyncedLyricsLineModel<TimedLyricsSegment>
  )[];
  positionMs: number;
  activeLineIndex: number;
  activeLineRef: RefObject<HTMLButtonElement>;
  onLineClick: (startMs: number) => void;
};

export const SyncedLyricsLines: FC<SyncedLyricsLinesProps> = ({
  lyricsType,
  lines,
  positionMs,
  activeLineIndex,
  activeLineRef,
  onLineClick,
}) => {
  const refFor = (index: number) =>
    index === activeLineIndex ? activeLineRef : undefined;

  const breakBefore = (index: number) => {
    const instrumentalBreak = getBreakBefore(lines, index);
    return (
      instrumentalBreak && (
        <InstrumentalBreak {...instrumentalBreak} positionMs={positionMs} />
      )
    );
  };

  if (lyricsType === 'wordSynced') {
    return (lines as SyncedLyricsLineModel<TimedLyricsSegment>[]).map(
      (line, index) => (
        <Fragment key={index}>
          {breakBefore(index)}
          <WordSyncedLyricsLine
            ref={refFor(index)}
            line={line}
            positionMs={positionMs}
            onClick={() => onLineClick(line.startMs)}
          />
        </Fragment>
      ),
    );
  }

  return (lines as SyncedLyricsLineModel<LyricsSegment>[]).map(
    (line, index) => (
      <Fragment key={index}>
        {breakBefore(index)}
        <LineSyncedLyricsLine
          ref={refFor(index)}
          line={line}
          positionMs={positionMs}
          onClick={() => onLineClick(line.startMs)}
        />
      </Fragment>
    ),
  );
};
