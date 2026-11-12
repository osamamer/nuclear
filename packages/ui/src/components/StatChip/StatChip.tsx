import { ComponentProps, FC, ReactNode } from 'react';

import { cn } from '../../utils';
import { StatChipSkeleton } from './StatChipSkeleton';

type StatChipProps = ComponentProps<'div'> & {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
};

const StatChipBase: FC<StatChipProps> = ({
  value,
  label,
  icon,
  className,
  ...props
}) => (
  <div
    className={cn(
      'border-border/70 flex items-center gap-2 rounded-md border-(length:--border-width) bg-transparent px-2 py-1',
      className,
    )}
    {...props}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="font-heading text-base font-bold">{value}</span>
    <span className="text-foreground/60 text-xs font-bold tracking-wide uppercase">
      {label}
    </span>
  </div>
);

export const StatChip = Object.assign(StatChipBase, {
  Skeleton: StatChipSkeleton,
});
