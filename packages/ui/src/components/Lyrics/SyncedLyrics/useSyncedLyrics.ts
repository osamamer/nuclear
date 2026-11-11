import findLastIndex from 'lodash-es/findLastIndex';
import { RefObject, useCallback, useEffect, useRef } from 'react';

import type {
  LyricsSegment,
  SyncedLyricsLine as SyncedLyricsLineModel,
  TimedLyricsSegment,
} from '@nuclearplayer/model';

import { useActiveLineDirection } from './useActiveLineDirection';

const ANCHOR_RATIO = 0.3;

type Options = {
  lines: (
    | SyncedLyricsLineModel<LyricsSegment>
    | SyncedLyricsLineModel<TimedLyricsSegment>
  )[];
  positionMs: number;
  viewportRef: RefObject<HTMLDivElement>;
  autoScroll: boolean;
};

export const useSyncedLyrics = ({
  lines,
  positionMs,
  viewportRef,
  autoScroll,
}: Options) => {
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const activeLineIndex = findLastIndex(
    lines,
    (line) => line.startMs <= positionMs,
  );
  const activeLineDirection = useActiveLineDirection(
    viewportRef,
    activeLineRef,
    activeLineIndex,
  );

  const scrollToActiveLine = useCallback(() => {
    const viewport = viewportRef.current;
    const activeLine = activeLineRef.current;
    if (!viewport || !activeLine) {
      return;
    }
    const lineTop =
      activeLine.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top;
    viewport.scrollTop =
      viewport.scrollTop + lineTop - viewport.clientHeight * ANCHOR_RATIO;
  }, [viewportRef]);

  useEffect(() => {
    if (autoScroll) {
      scrollToActiveLine();
    }
  }, [autoScroll, activeLineIndex, scrollToActiveLine]);

  return {
    activeLineRef,
    activeLineIndex,
    activeLineDirection,
    scrollToActiveLine,
  };
};
