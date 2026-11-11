import type { DragEndEvent } from '@dnd-kit/core';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useRef } from 'react';

import { Track } from '@nuclearplayer/model';

import { useVirtualRows } from '../../hooks';
import { cn } from '../../utils';
import { ScrollableArea } from '../ScrollableArea';
import { defaultDisplay, defaultFeatures } from './defaults';
import { useColumns } from './hooks/useColumns';
import { useGlobalFilter } from './hooks/useGlobalFilter';
import { useReorder } from './hooks/useReorder';
import { useSorting } from './hooks/useSorting';
import { ReorderLayer } from './ReorderLayer';
import { TrackTableSkeleton } from './Skeleton/TrackTableSkeleton';
import { SortableRow } from './SortableRow';
import { Toolbar } from './Toolbar';
import { TrackTableProvider } from './TrackTableContext';
import { TrackTableProps } from './types';
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './utils/constants';
import { VirtualizedBody } from './VirtualizedBody';

const defaultGetItemId = <T extends Track>(track: T) => track.source.id;

function TrackTableBase<T extends Track = Track>({
  tracks,
  getItemId = defaultGetItemId,
  labels,
  classes,
  display,
  features,
  actions,
  meta,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: TrackTableProps<T>) {
  const resolvedFeatures = {
    ...defaultFeatures,
    ...features,
  };

  const resolvedDisplay = {
    ...defaultDisplay,
    ...display,
  };

  const { sorting, setSorting, isSorted } = useSorting();
  const itemIds = useMemo(
    () => tracks.map((t, i) => getItemId(t, i)),
    [tracks, getItemId],
  );
  const { onDragStart, onDragEnd } = useReorder({
    itemIds,
    onReorder: actions?.onReorder,
  });
  const { globalFilter, setGlobalFilter, globalFilterFn, hasFilter } =
    useGlobalFilter<T>();

  const columns: ColumnDef<T>[] = useColumns<T>({
    display: resolvedDisplay,
    labels,
    actions,
  });

  const table = useReactTable({
    columns,
    data: tracks,
    state: { sorting, globalFilter },
    enableSortingRemoval: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      displayQueueControls: resolvedDisplay.displayQueueControls,
      displayThumbnail: resolvedDisplay.displayThumbnail,
      displayArtist: resolvedDisplay.displayArtist,
      onAddToQueue: actions?.onAddToQueue,
      onToggleFavorite: actions?.onToggleFavorite,
      onRemove: actions?.onRemove,
      isTrackFavorite: meta?.isTrackFavorite,
      ContextMenuWrapper: meta?.ContextMenuWrapper,
      activeTrackKey: meta?.activeTrackKey,
    },
  });

  const { rows } = table.getRowModel();
  const colCount = table.getVisibleFlatColumns().length;

  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const { virtualItems, paddingTop, paddingBottom } = useVirtualRows({
    count: rows.length,
    rowHeight,
    overscan,
    scrollParentRef,
  });

  const isReorderable = Boolean(
    resolvedFeatures?.reorderable && !isSorted && !hasFilter,
  );

  const dndItems = rows.map((row) => getItemId(row.original, row.index));

  const testViewportHeight = rowHeight * 12;

  return (
    <TrackTableProvider
      value={{
        isReorderable,
        features: resolvedFeatures,
        actions,
        labels,
      }}
    >
      <div className="flex h-full flex-col">
        <Toolbar
          filterValue={globalFilter}
          onFilterChange={setGlobalFilter}
          className="mb-2 shrink-0"
        />
        <ScrollableArea
          viewportRef={scrollParentRef}
          className="min-h-0 flex-1"
          testViewportHeight={testViewportHeight}
        >
          <ReorderLayer
            enabled={isReorderable}
            items={dndItems}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd as (evt: DragEndEvent) => void}
          >
            <table
              role="table"
              className={cn(
                'relative w-full table-fixed border-separate border-spacing-0',
                classes?.root,
              )}
            >
              {resolvedFeatures?.header && (
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      role="row"
                      className="border-border/50 bg-background/95 text-foreground/55 border-b text-xs font-semibold tracking-wide uppercase backdrop-blur"
                    >
                      {headerGroup.headers.map((header) =>
                        flexRender(header.column.columnDef.header, {
                          ...header.getContext(),
                          key: header.id,
                        }),
                      )}
                    </tr>
                  ))}
                </thead>
              )}
              <VirtualizedBody
                rows={rows}
                virtualItems={virtualItems}
                paddingTop={paddingTop}
                paddingBottom={paddingBottom}
                colSpan={colCount}
                rowHeight={rowHeight}
                renderRow={({ row, virtual }) => (
                  <SortableRow
                    key={getItemId(row.original, row.index)}
                    row={row}
                    itemId={getItemId(row.original, row.index)}
                    style={{ height: rowHeight }}
                    isReorderable={isReorderable}
                    onClick={
                      actions?.onRowClick
                        ? () => actions.onRowClick?.(row.original)
                        : undefined
                    }
                    data-index={virtual.index}
                  />
                )}
              />
            </table>
          </ReorderLayer>
        </ScrollableArea>
      </div>
    </TrackTableProvider>
  );
}

export const TrackTable = Object.assign(TrackTableBase, {
  Skeleton: TrackTableSkeleton,
});
