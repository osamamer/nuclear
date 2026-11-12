import {
  FC,
  memo,
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '../../utils';

export type ScrollableAreaProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  fadeScrollbars?: boolean;
  autoHideDelay?: number; // ms, default 1000
  viewportRef?: MutableRefObject<HTMLDivElement | null>;
  testViewportHeight?: number;
  'data-testid'?: string;
};

type ScrollMetrics = {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
};

const initialMetrics: ScrollMetrics = {
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 0,
  scrollWidth: 0,
  clientHeight: 0,
  clientWidth: 0,
};

function useScrollMetrics(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  fadeScrollbars: boolean,
  autoHideDelay: number,
) {
  const [metrics, setMetrics] = useState<ScrollMetrics>(initialMetrics);
  const [isScrolling, setIsScrolling] = useState(false);
  const isScrollingRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef<number>();

  const updateDimensions = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const nextMetrics = {
      scrollTop: el.scrollTop,
      scrollLeft: el.scrollLeft,
      scrollHeight: el.scrollHeight,
      scrollWidth: el.scrollWidth,
      clientHeight: el.clientHeight,
      clientWidth: el.clientWidth,
    };

    setMetrics((current) =>
      current.scrollTop === nextMetrics.scrollTop &&
      current.scrollLeft === nextMetrics.scrollLeft &&
      current.scrollHeight === nextMetrics.scrollHeight &&
      current.scrollWidth === nextMetrics.scrollWidth &&
      current.clientHeight === nextMetrics.clientHeight &&
      current.clientWidth === nextMetrics.clientWidth
        ? current
        : nextMetrics,
    );
  }, [containerRef]);

  const updateScrollPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const scrollTop = el.scrollTop;
    const scrollLeft = el.scrollLeft;
    setMetrics((current) =>
      current.scrollTop === scrollTop && current.scrollLeft === scrollLeft
        ? current
        : { ...current, scrollTop, scrollLeft },
    );
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updateScrollPosition();
      if (fadeScrollbars) {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          setIsScrolling(true);
        }
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          setIsScrolling(false);
        }, autoHideDelay);
      }
    });
  }, [fadeScrollbars, autoHideDelay, updateScrollPosition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateDimensions);
    const observedChildren = new Set<Element>();
    const observeChildren = () => {
      const currentChildren = new Set(Array.from(el.children));
      observedChildren.forEach((child) => {
        if (!currentChildren.has(child)) {
          resizeObserver.unobserve(child);
          observedChildren.delete(child);
        }
      });
      currentChildren.forEach((child) => {
        if (!observedChildren.has(child)) {
          resizeObserver.observe(child);
          observedChildren.add(child);
        }
      });
      updateDimensions();
    };

    resizeObserver.observe(el);
    observeChildren();
    const mutationObserver = new MutationObserver(observeChildren);
    mutationObserver.observe(el, { childList: true });
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [containerRef, handleScroll, updateDimensions]);

  return { metrics, isScrolling };
}

// Scrollbar (track + thumb)
interface BarProps {
  orientation: 'vertical' | 'horizontal';
  metrics: ScrollMetrics;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  fadeScrollbars: boolean;
  isScrolling: boolean;
}

const Scrollbar: FC<BarProps> = ({
  orientation,
  metrics,
  containerRef,
  fadeScrollbars,
  isScrolling,
}) => {
  const {
    scrollTop,
    scrollLeft,
    scrollHeight,
    scrollWidth,
    clientHeight,
    clientWidth,
  } = metrics;
  const vertical = orientation === 'vertical';
  const contentExtent = vertical ? scrollHeight : scrollWidth;
  const viewportExtent = vertical ? clientHeight : clientWidth;
  const scrollPos = vertical ? scrollTop : scrollLeft;

  const needs = contentExtent > viewportExtent;
  const [isDragging, setIsDragging] = useState(false);

  const { thumbSize, thumbOffset } = useMemo(() => {
    if (!needs || viewportExtent === 0 || contentExtent <= viewportExtent) {
      return { thumbSize: 0, thumbOffset: 0 };
    }
    const trackSize = viewportExtent; // we size track to viewport extent
    const size = Math.max(20, (viewportExtent / contentExtent) * trackSize);
    const maxScroll = contentExtent - viewportExtent;
    const ratio = maxScroll === 0 ? 0 : scrollPos / maxScroll;
    const offset = ratio * (trackSize - size);
    return { thumbSize: size, thumbOffset: offset };
  }, [needs, viewportExtent, contentExtent, scrollPos]);

  const show = needs && (!fadeScrollbars || isScrolling || isDragging);

  const onTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!needs || !containerRef.current) {
        return;
      }
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const clickPos = vertical ? e.clientY - rect.top : e.clientX - rect.left;
      const trackSize = vertical ? rect.height : rect.width;
      const maxScroll = contentExtent - viewportExtent;
      const ratio = trackSize - thumbSize <= 0 ? 0 : clickPos / trackSize;
      const target = ratio * maxScroll;
      if (vertical) {
        containerRef.current.scrollTop = target;
      } else {
        containerRef.current.scrollLeft = target;
      }
    },
    [needs, containerRef, vertical, contentExtent, viewportExtent, thumbSize],
  );

  const onThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      const startClient = vertical ? e.clientY : e.clientX;
      const startScroll = vertical
        ? containerRef.current.scrollTop
        : containerRef.current.scrollLeft;
      const maxScroll = contentExtent - viewportExtent;
      const trackSize = viewportExtent; // track matches viewport
      const move = (ev: MouseEvent) => {
        if (!containerRef.current) {
          return;
        }
        const currentClient = vertical ? ev.clientY : ev.clientX;
        const deltaClient = currentClient - startClient;
        const scrollDelta =
          trackSize - thumbSize <= 0
            ? 0
            : (deltaClient / (trackSize - thumbSize)) * maxScroll;
        const next = Math.max(
          0,
          Math.min(maxScroll, startScroll + scrollDelta),
        );
        if (vertical) {
          containerRef.current.scrollTop = next;
        } else {
          containerRef.current.scrollLeft = next;
        }
      };
      const up = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    },
    [containerRef, vertical, contentExtent, viewportExtent, thumbSize],
  );

  if (!needs) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute flex bg-transparent select-none',
        vertical
          ? 'top-0 right-0 bottom-0 w-3 flex-col items-center'
          : 'right-0 bottom-0 left-0 h-3 flex-row items-center',
      )}
      onClick={onTrackClick}
    >
      <div
        className={cn(
          'bg-foreground/80 hover:bg-foreground cursor-pointer rounded-sm transition-opacity duration-200',
          vertical ? 'w-2' : 'h-2',
          show ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          [vertical ? 'height' : 'width']: `${thumbSize}px`,
          transform: vertical
            ? `translateY(${thumbOffset}px)`
            : `translateX(${thumbOffset}px)`,
        }}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
};

type ScrollbarOverlayProps = {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  fadeScrollbars: boolean;
  autoHideDelay: number;
};

const ScrollbarOverlayImpl: FC<ScrollbarOverlayProps> = ({
  containerRef,
  fadeScrollbars,
  autoHideDelay,
}) => {
  const { metrics, isScrolling } = useScrollMetrics(
    containerRef,
    fadeScrollbars,
    autoHideDelay,
  );
  const needsVertical = metrics.scrollHeight > metrics.clientHeight;
  const needsHorizontal = metrics.scrollWidth > metrics.clientWidth;
  const needsCorner = needsVertical && needsHorizontal;

  return (
    <>
      <Scrollbar
        orientation="vertical"
        metrics={metrics}
        containerRef={containerRef}
        fadeScrollbars={fadeScrollbars}
        isScrolling={isScrolling}
      />
      <Scrollbar
        orientation="horizontal"
        metrics={metrics}
        containerRef={containerRef}
        fadeScrollbars={fadeScrollbars}
        isScrolling={isScrolling}
      />
      {needsCorner && (
        <div className="absolute right-0 bottom-0 h-3 w-3 bg-transparent" />
      )}
    </>
  );
};

const ScrollbarOverlay = memo(ScrollbarOverlayImpl);

export const ScrollableArea: FC<ScrollableAreaProps> = ({
  children,
  className,
  viewportClassName,
  fadeScrollbars = true,
  autoHideDelay = 1000,
  viewportRef,
  testViewportHeight,
  'data-testid': testId,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const setViewportNode = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      if (viewportRef) {
        viewportRef.current = node;
      }
    },
    [ref, viewportRef],
  );

  return (
    <div
      className={cn('relative h-full w-full', className)}
      data-testid={testId}
    >
      <div
        ref={setViewportNode}
        className={cn(
          'scrollbar-hide flex h-full w-full flex-col overflow-auto',
          viewportClassName,
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        data-test-resize-observer-block-size={
          testViewportHeight != null ? String(testViewportHeight) : undefined
        }
      >
        {children}
      </div>
      <ScrollbarOverlay
        containerRef={ref}
        fadeScrollbars={fadeScrollbars}
        autoHideDelay={autoHideDelay}
      />
    </div>
  );
};
