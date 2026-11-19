import { CellContext } from '@tanstack/react-table';

import { Track } from '@nuclearplayer/model';

import { cn } from '../../../utils';

export const TextCell = <T extends Track>({
  column,
  getValue,
}: CellContext<T, string | number | undefined>) => (
  <td
    className={cn(
      'text-foreground/60 cursor-default truncate px-2 text-xs',
      column.id === 'duration' && 'text-right tabular-nums',
    )}
  >
    <div className="truncate">{getValue()}</div>
  </td>
);
