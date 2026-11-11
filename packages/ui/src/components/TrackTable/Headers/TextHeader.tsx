import { HeaderContext } from '@tanstack/react-table';
import { SortAsc, SortDesc } from 'lucide-react';
import { PropsWithChildren, useCallback } from 'react';

import { Track } from '@nuclearplayer/model';
import { cn } from '@nuclearplayer/ui';

type HeaderValue = string | undefined;

export function TextHeader<T extends Track>({
  children,
  context,
  className,
}: PropsWithChildren<{
  context: HeaderContext<T, HeaderValue>;
  className?: string;
}>) {
  const { getCanSort, getIsSorted, toggleSorting } = context.column;

  const isSorted = getIsSorted();
  const canSort = getCanSort();

  const onClick = useCallback(() => {
    if (canSort) {
      toggleSorting();
    }
  }, []);

  return (
    <th
      role="columnheader"
      className={cn(
        'text-foreground/55 px-2 py-2 text-left text-[11px] font-semibold tracking-wider uppercase',
        className,
        {
          'cursor-pointer': canSort,
        },
      )}
      onClick={onClick}
    >
      <span className="flex items-center">
        {children}
        {isSorted === 'desc' && <SortDesc className="ml-1 h-4 w-4" />}
        {isSorted === 'asc' && <SortAsc className="ml-1 h-4 w-4" />}
      </span>
    </th>
  );
}
