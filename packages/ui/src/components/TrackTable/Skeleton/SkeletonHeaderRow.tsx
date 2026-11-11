import { FC } from 'react';

import { TrackTableSkeletonColumnKind } from '../types';
import { SkeletonColumn } from './skeletonColumns';
import { SkeletonIconHeader } from './SkeletonIconHeader';
import { SkeletonTextHeader } from './SkeletonTextHeader';

const headerByKind: Record<
  TrackTableSkeletonColumnKind,
  FC<{ className?: string }>
> = {
  icon: SkeletonIconHeader,
  thumbnail: SkeletonIconHeader,
  text: SkeletonTextHeader,
};

type SkeletonHeaderRowProps = {
  columns: SkeletonColumn[];
};

export const SkeletonHeaderRow: FC<SkeletonHeaderRowProps> = ({ columns }) => (
  <tr className="border-border/50 bg-background/95 text-foreground/55 border-b text-xs font-semibold tracking-wide uppercase backdrop-blur">
    {columns.map((column) => {
      const Header = headerByKind[column.kind];
      return <Header key={column.id} className={column.className} />;
    })}
  </tr>
);
