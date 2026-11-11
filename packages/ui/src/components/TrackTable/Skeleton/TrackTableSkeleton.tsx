import range from 'lodash-es/range';
import { FC } from 'react';

import { cn } from '../../../utils';
import { defaultDisplay } from '../defaults';
import { TrackTableProps } from '../types';
import { getSkeletonColumns } from './skeletonColumns';
import { SkeletonHeaderRow } from './SkeletonHeaderRow';
import { SkeletonRow } from './SkeletonRow';

type TrackTableSkeletonProps = {
  rows?: number;
  header?: boolean;
  display?: TrackTableProps['display'];
  className?: string;
  'data-testid'?: string;
};

export const TrackTableSkeleton: FC<TrackTableSkeletonProps> = ({
  rows = 10,
  header = true,
  display,
  className,
  'data-testid': testId = 'track-table-skeleton',
}) => {
  const resolvedDisplay = { ...defaultDisplay, ...display };
  const columns = getSkeletonColumns(resolvedDisplay);

  return (
    <table
      role="table"
      data-testid={testId}
      className={cn(
        'relative w-full table-fixed border-separate border-spacing-0',
        className,
      )}
    >
      {header && (
        <thead>
          <SkeletonHeaderRow columns={columns} />
        </thead>
      )}
      <tbody>
        {range(rows).map((rowIndex) => (
          <SkeletonRow
            key={rowIndex}
            columns={columns}
            rowIndex={rowIndex}
            displayThumbnail={resolvedDisplay.displayThumbnail}
            displayArtist={resolvedDisplay.displayArtist}
          />
        ))}
      </tbody>
    </table>
  );
};
