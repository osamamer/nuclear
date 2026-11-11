import { Link } from '@tanstack/react-router';
import { FC, ReactNode } from 'react';

import { cn } from '../../utils';
import { Tooltip } from '../Tooltip/Tooltip';
import { useSidebarCompact } from './SidebarCompactContext';

type SidebarNavigationItemProps = {
  icon: ReactNode;
  label: string;
  isSelected?: boolean;
  to?: string;
  onClick?: () => void;
  isFeatured?: boolean;
  exact?: boolean;
};

const MaybeNavLink: FC<{
  to?: string;
  exact?: boolean;
  isSelected?: boolean;
  children: (isSelected: boolean) => ReactNode;
}> = ({ to, exact = false, isSelected = false, children }) => {
  if (to) {
    return (
      <Link to={to} activeOptions={{ exact }}>
        {({ isActive }) => children(isActive)}
      </Link>
    );
  }
  return <>{children(isSelected)}</>;
};

export const SidebarNavigationItem: FC<SidebarNavigationItemProps> = ({
  icon,
  label,
  isSelected,
  to,
  onClick,
  isFeatured = false,
  exact = false,
}) => {
  const isCompact = useSidebarCompact();

  return (
    <MaybeNavLink to={to} exact={exact} isSelected={isSelected}>
      {(active) => (
        <Tooltip content={label} side="right" disabled={!isCompact}>
          <div
            role={onClick ? 'button' : undefined}
            onClick={onClick}
            data-testid="sidebar-navigation-item"
            className={cn(
              'group flex min-h-10 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-transparent px-1.5 transition-colors duration-150',
              {
                'bg-primary/10 text-foreground hover:bg-primary/15':
                  isFeatured && !active,
                'bg-primary text-primary-foreground font-semibold':
                  isFeatured && active,
                'text-foreground/70 hover:bg-muted/70 hover:text-foreground':
                  !isFeatured && !active,
                'bg-muted text-foreground font-semibold': !isFeatured && active,
              },
            )}
          >
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center [&>svg]:size-[18px]',
                {
                  'text-primary':
                    (isFeatured && !active) || (!isFeatured && active),
                  'text-primary-foreground': isFeatured && active,
                  'text-foreground/55 group-hover:text-foreground':
                    !isFeatured && !active,
                },
              )}
            >
              {icon}
            </div>
            <span
              className={cn(
                'min-w-0 truncate text-sm whitespace-nowrap transition-opacity duration-150',
                isFeatured && 'font-semibold',
                {
                  'opacity-0': isCompact,
                  'opacity-100': !isCompact,
                },
              )}
            >
              {label}
            </span>
          </div>
        </Tooltip>
      )}
    </MaybeNavLink>
  );
};
