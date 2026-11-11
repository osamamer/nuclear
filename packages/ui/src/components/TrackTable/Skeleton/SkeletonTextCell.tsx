import { FC } from 'react';

import { cn } from '../../../utils';
import { Skeleton } from '../../Skeleton';

type SkeletonTextCellProps = {
  rowIndex: number;
  displayThumbnail?: boolean;
  displayArtist?: boolean;
};

export const SkeletonTextCell: FC<SkeletonTextCellProps> = ({
  rowIndex,
  displayThumbnail,
  displayArtist,
}) => {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6'];

  return (
    <td className="px-2">
      <div className="flex items-center gap-3">
        {displayThumbnail && <Skeleton className="size-10 shrink-0" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className={cn('h-3.5', widths[rowIndex % widths.length])} />
          {displayArtist && <Skeleton className="h-3 w-1/3" />}
        </div>
      </div>
    </td>
  );
};
