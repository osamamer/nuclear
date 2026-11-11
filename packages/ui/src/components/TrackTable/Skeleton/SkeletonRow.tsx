import { FC } from 'react';

import { TrackTableSkeletonColumnKind } from '../types';
import { DEFAULT_ROW_HEIGHT } from '../utils/constants';
import { SkeletonColumn } from './skeletonColumns';
import { SkeletonIconCell } from './SkeletonIconCell';
import { SkeletonTextCell } from './SkeletonTextCell';
import { SkeletonThumbnailCell } from './SkeletonThumbnailCell';

type SkeletonCellProps = {
  rowIndex: number;
  displayThumbnail?: boolean;
  displayArtist?: boolean;
};

const cellByKind: Record<
  TrackTableSkeletonColumnKind,
  FC<SkeletonCellProps>
> = {
  icon: SkeletonIconCell,
  thumbnail: SkeletonThumbnailCell,
  text: SkeletonTextCell,
};

type SkeletonRowProps = {
  columns: SkeletonColumn[];
  rowIndex: number;
  displayThumbnail?: boolean;
  displayArtist?: boolean;
};

export const SkeletonRow: FC<SkeletonRowProps> = ({
  columns,
  rowIndex,
  displayThumbnail,
  displayArtist,
}) => (
  <tr
    data-testid="track-row-skeleton"
    style={{ height: DEFAULT_ROW_HEIGHT }}
    className="border-b border-transparent"
  >
    {columns.map((column) => {
      const Cell = cellByKind[column.kind];
      return (
        <Cell
          key={column.id}
          rowIndex={rowIndex}
          displayThumbnail={column.id === 'title' && displayThumbnail}
          displayArtist={column.id === 'title' && displayArtist}
        />
      );
    })}
  </tr>
);
