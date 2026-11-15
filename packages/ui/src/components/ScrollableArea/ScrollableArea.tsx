import {
  FC,
  memo,
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  autoHideDelay?: number;
  thinScrollbar?: boolean;
  viewportRef?: MutableRefObject<HTMLDivElement | null>;
  testViewportHeight?: number;
  'data-testid'?: string;
};

type ScrollDimensions = {
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
};

const initialDimensions: ScrollDimensions = {
  scrollHeight: 0,
  scrollWidth: 0,
  clientHeight: 0,
  clientWidth: 0,
};

type Orientation = 'vertical' | 'horizontal';

type ThumbGeometry = {
  thumbSize: number;
  trackTravel: number;
  maxScroll: number;
};

const computeThumbGeometry = (
  orientation: Orientation,
  dimensions: ScrollDimensions,
): ThumbGeometry => {
  const vertical = orientation === 'vertical';
  const contentExtent = vertical
    ? dimensions.scrollHeight
    : dimensions.scrollWidth;
  const viewportExtent = vertical
    ? dimensions.clientHeight
    : dimensions.clientWidth;
  if (viewportExtent === 0 || contentExtent <= viewportExtent) {
    return { thumbSize: 0, trackTravel: 0, maxScroll: 0 };
  }
  const thumbSize = Math.max(
    20,
    (viewportExtent / contentExtent) * viewportExtent,
  );
  return {
    thumbSize,
    trackTravel: viewportExtent - thumbSize,
    maxScroll: contentExtent - viewportExtent,
  };
};

const thumbTransform = (
  orientation: Orientation,
  geometry: ThumbGeometry,
  scrollPosition: number,
) => {
  const ratio =
    geometry.maxScroll === 0 ? 0 : scrollPosition / geometry.maxScroll;
  const offset = Math.min(1, Math.max(0, ratio)) * geometry.trackTravel;
  return orientation === 'vertical'
    ? `translate3d(0, ${offset}px, 0)`
    : `translate3d(${offset}px, 0, 0)`;
};

function useScrollDimensions(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  fadeScrollbars: boolean,
  autoHideDelay: number,
  onScrollFrame: () => void,
) {
  const [dimensions, setDimensions] =
    useState<ScrollDimensions>(initialDimensions);
  const [isScrolling, setIsScrolling] = useState(false);
  const isScrollingRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef<number>();
  const onScrollFrameRef = useRef(onScrollFrame);
  onScrollFrameRef.current = onScrollFrame;

  const updateDimensions = useCallback(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const nextDimensions = {
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
    };

    setDimensions((current) =>
      current.scrollHeight === nextDimensions.scrollHeight &&
      current.scrollWidth === nextDimensions.scrollWidth &&
      current.clientHeight === nextDimensions.clientHeight &&
      current.clientWidth === nextDimensions.clientWidth
        ? current
        : nextDimensions,
    );
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined;
      onScrollFrameRef.current();
      if (!fadeScrollbars) {
        return;
      }
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
    });
  }, [fadeScrollbars, autoHideDelay]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateDimensions);
    const observedChildren = new Set<Element>();
    const observeChildren = () => {
      const currentChildren = new Set(Array.from(element.children));
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

    resizeObserver.observe(element);
    observeChildren();
    const mutationObserver = new MutationObserver(observeChildren);
    mutationObserver.observe(element, { childList: true });
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      element.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [containerRef, handleScroll, updateDimensions]);

  return { dimensions, isScrolling };
}

type BarProps = {
  orientation: Orientation;
  thin: boolean;
  geometry: ThumbGeometry;
  thumbRef: MutableRefObject<HTMLDivElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  fadeScrollbars: boolean;
  isScrolling: boolean;
};

const Scrollbar: FC<BarProps> = ({
  orientation,
  thin,
  geometry,
  thumbRef,
  containerRef,
  fadeScrollbars,
  isScrolling,
}) => {
  const vertical = orientation === 'vertical';
  const { thumbSize, trackTravel, maxScroll } = geometry;
  const needs = thumbSize > 0;
  const [isDragging, setIsDragging] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!container || !thumb) {
      return;
    }
    thumb.style.transform = thumbTransform(
      orientation,
      geometry,
      vertical ? container.scrollTop : container.scrollLeft,
    );
  }, [containerRef, thumbRef, orientation, geometry, vertical]);

  const show = needs && (!fadeScrollbars || isScrolling || isDragging);

  const onTrackClick = useCallback(
    (event: React.MouseEvent) => {
      if (!needs || !containerRef.current) {
        return;
      }
      const rect = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();
      const clickPosition = vertical
        ? event.clientY - rect.top
        : event.clientX - rect.left;
      const trackSize = vertical ? rect.height : rect.width;
      const ratio = trackTravel <= 0 ? 0 : clickPosition / trackSize;
      const target = ratio * maxScroll;
      if (vertical) {
        containerRef.current.scrollTop = target;
      } else {
        containerRef.current.scrollLeft = target;
      }
    },
    [needs, containerRef, vertical, trackTravel, maxScroll],
  );

  const onThumbMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      event.preventDefault();
      setIsDragging(true);
      const startClient = vertical ? event.clientY : event.clientX;
      const startScroll = vertical
        ? containerRef.current.scrollTop
        : containerRef.current.scrollLeft;
      const move = (moveEvent: MouseEvent) => {
        if (!containerRef.current) {
          return;
        }
        const currentClient = vertical ? moveEvent.clientY : moveEvent.clientX;
        const scrollDelta =
          trackTravel <= 0
            ? 0
            : ((currentClient - startClient) / trackTravel) * maxScroll;
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
    [containerRef, vertical, trackTravel, maxScroll],
  );

  if (!needs) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute flex bg-transparent select-none',
        vertical
          ? 'top-0 right-0 bottom-0 flex-col items-center'
          : 'right-0 bottom-0 left-0 flex-row items-center',
        vertical && (thin ? 'w-1.5' : 'w-3'),
        !vertical && (thin ? 'h-1.5' : 'h-3'),
      )}
      onClick={onTrackClick}
    >
      <div
        ref={thumbRef}
        className={cn(
          'bg-foreground/80 hover:bg-foreground cursor-pointer rounded-sm transition-opacity duration-200 will-change-transform',
          vertical && (thin ? 'w-1' : 'w-2'),
          !vertical && (thin ? 'h-1' : 'h-2'),
          show ? 'opacity-100' : 'opacity-0',
        )}
        style={{ [vertical ? 'height' : 'width']: `${thumbSize}px` }}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
};

type ScrollbarOverlayProps = {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  thin: boolean;
  fadeScrollbars: boolean;
  autoHideDelay: number;
};

const ScrollbarOverlayImpl: FC<ScrollbarOverlayProps> = ({
  containerRef,
  thin,
  fadeScrollbars,
  autoHideDelay,
}) => {
  const verticalThumbRef = useRef<HTMLDivElement | null>(null);
  const horizontalThumbRef = useRef<HTMLDivElement | null>(null);
  const geometryRef = useRef<{
    vertical: ThumbGeometry;
    horizontal: ThumbGeometry;
  } | null>(null);

  const syncThumbs = useCallback(() => {
    const container = containerRef.current;
    const geometry = geometryRef.current;
    if (!container || !geometry) {
      return;
    }
    if (verticalThumbRef.current) {
      verticalThumbRef.current.style.transform = thumbTransform(
        'vertical',
        geometry.vertical,
        container.scrollTop,
      );
    }
    if (horizontalThumbRef.current) {
      horizontalThumbRef.current.style.transform = thumbTransform(
        'horizontal',
        geometry.horizontal,
        container.scrollLeft,
      );
    }
  }, [containerRef]);

  const { dimensions, isScrolling } = useScrollDimensions(
    containerRef,
    fadeScrollbars,
    autoHideDelay,
    syncThumbs,
  );
  const verticalGeometry = useMemo(
    () => computeThumbGeometry('vertical', dimensions),
    [dimensions],
  );
  const horizontalGeometry = useMemo(
    () => computeThumbGeometry('horizontal', dimensions),
    [dimensions],
  );
  geometryRef.current = {
    vertical: verticalGeometry,
    horizontal: horizontalGeometry,
  };
  const needsCorner =
    verticalGeometry.thumbSize > 0 && horizontalGeometry.thumbSize > 0;

  return (
    <>
      <Scrollbar
        orientation="vertical"
        thin={thin}
        geometry={verticalGeometry}
        thumbRef={verticalThumbRef}
        containerRef={containerRef}
        fadeScrollbars={fadeScrollbars}
        isScrolling={isScrolling}
      />
      <Scrollbar
        orientation="horizontal"
        thin={thin}
        geometry={horizontalGeometry}
        thumbRef={horizontalThumbRef}
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
  thinScrollbar = false,
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
        thin={thinScrollbar}
        fadeScrollbars={fadeScrollbars}
        autoHideDelay={autoHideDelay}
      />
    </div>
  );
};
