import { FC } from 'react';

import { cn } from '../../utils';
import { Skeleton } from '../Skeleton';

type NuclearJamSearchResultTrackSkeletonProps = {
  className?: string;
};

export const NuclearJamSearchResultTrackSkeleton: FC<
  NuclearJamSearchResultTrackSkeletonProps
> = ({ className }) => (
  <div
    className={cn(
      'flex h-14 w-full items-center gap-3 rounded-lg px-2',
      className,
    )}
    data-testid="jam-search-result-track-skeleton"
  >
    <Skeleton className="size-10 shrink-0 rounded-md" />

    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-5 items-center">
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <div className="flex h-4 items-center">
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>

    <div className="flex h-4 shrink-0 items-center">
      <Skeleton className="h-2.5 w-8" />
    </div>
  </div>
);
