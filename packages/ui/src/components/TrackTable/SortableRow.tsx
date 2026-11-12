import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, Row } from '@tanstack/react-table';
import { memo, useCallback } from 'react';

import { Track } from '@nuclearplayer/model';

import { cn } from '../../utils';

type SortableRowProps<T extends Track = Track> = {
  row: Row<T>;
  itemId: string;
  isReorderable?: boolean;
  isActive?: boolean;
  onClick?: (track: T) => void;
  style?: React.CSSProperties;
};

function SortableRowImpl<T extends Track = Track>({
  row,
  itemId,
  isReorderable = false,
  isActive = false,
  onClick,
  style: externalStyle,
}: SortableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemId,
    disabled: !isReorderable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...externalStyle,
  };
  const handleClick = useCallback(() => {
    onClick?.(row.original);
  }, [onClick, row.original]);

  return (
    <tr
      data-testid="track-row"
      data-now-playing={isActive ? 'true' : undefined}
      aria-current={isActive ? 'true' : undefined}
      ref={setNodeRef}
      style={style}
      className={cn('group transition-colors select-none', {
        'hover:bg-muted/65': !isDragging && !isActive,
        'bg-accent-green/10 ring-accent-green/35 hover:bg-accent-green/15 ring-1 ring-inset':
          isActive && !isDragging,
        'bg-muted shadow-shadow z-50': isDragging && !isActive,
        'bg-accent-green/15 ring-accent-green/40 shadow-shadow z-50 ring-1 ring-inset':
          isDragging && isActive,
        'cursor-grab': isReorderable,
        'cursor-pointer': Boolean(onClick),
      })}
      onClick={onClick ? handleClick : undefined}
      {...attributes}
      {...listeners}
    >
      {row.getVisibleCells().map((cell) => (
        <Cell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
}

export const SortableRow = memo(SortableRowImpl) as typeof SortableRowImpl;

type CellProps<T extends Track> = {
  cell: ReturnType<Row<T>['getVisibleCells']>[number];
};

const Cell = <T extends Track>({ cell }: CellProps<T>) => {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
};
