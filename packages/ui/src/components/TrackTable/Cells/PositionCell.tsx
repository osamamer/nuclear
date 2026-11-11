import { CellContext } from '@tanstack/react-table';

import { Track } from '@nuclearplayer/model';

export const PositionCell = <T extends Track>({
  getValue,
}: CellContext<T, number>) => {
  return (
    <td className="text-foreground/55 min-w-10 text-center text-xs tabular-nums">
      {getValue()}
    </td>
  );
};
