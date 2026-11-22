import findLastIndex from 'lodash-es/findLastIndex';
import { RefObject, useCallback, useLayoutEffect, useRef } from 'react';

import type {
  LyricsSegment,
  SyncedLyricsLine as SyncedLyricsLineModel,
  TimedLyricsSegment,
} from '@nuclearplayer/model';

import { useActiveLineDirection } from './useActiveLineDirection';

const ANCHOR_RATIO = 0.3;

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const lineOffset = (viewport: HTMLDivElement, line: HTMLButtonElement) =>
  line.getBoundingClientRect().top - viewport.getBoundingClientRect().top;

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
  const nextLineRef = useRef<HTMLButtonElement>(null);
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
    const top =
      viewport.scrollTop +
      lineOffset(viewport, activeLine) -
      viewport.clientHeight * ANCHOR_RATIO;
    if (typeof viewport.scrollTo === 'function' && !reducedMotion()) {
      viewport.scrollTo({ top, behavior: 'smooth' });
    } else {
      viewport.scrollTop = top;
    }
  }, [viewportRef]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const active = activeLineRef.current;
    if (!autoScroll || !viewport || !active) {
      return;
    }

    const currentOffset = lineOffset(viewport, active);
    const next = nextLineRef.current;
    const currentStart = lines[activeLineIndex].startMs;
    const nextStart = lines[activeLineIndex + 1]?.startMs;
    const progress =
      next && nextStart > currentStart && !reducedMotion()
        ? (positionMs - currentStart) / (nextStart - currentStart)
        : 0;
    const offset =
      next && progress > 0
        ? currentOffset +
          (lineOffset(viewport, next) - currentOffset) * progress
        : currentOffset;
    const top =
      viewport.scrollTop + offset - viewport.clientHeight * ANCHOR_RATIO;
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top, behavior: 'instant' });
    } else {
      viewport.scrollTop = top;
    }
  }, [activeLineIndex, autoScroll, lines, positionMs, viewportRef]);

  return {
    activeLineRef,
    nextLineRef,
    activeLineIndex,
    activeLineDirection,
    scrollToActiveLine,
  };
};
