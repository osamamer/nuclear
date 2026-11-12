import type { DragEndEvent } from '@dnd-kit/core';
import { useCallback } from 'react';

export type UseReorderParams = {
  itemIds: string[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
};

export function useReorder({ itemIds, onReorder }: UseReorderParams) {
  const onDragStart = useCallback(() => {}, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) {
        return;
      }

      const fromIndex = itemIds.indexOf(active.id as string);
      const toIndex = itemIds.indexOf(over.id as string);

      onReorder(fromIndex, toIndex);
    },
    [itemIds, onReorder],
  );

  return { onDragStart, onDragEnd } as const;
}
