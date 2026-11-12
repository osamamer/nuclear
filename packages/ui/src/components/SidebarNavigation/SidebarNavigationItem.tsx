import { Link } from '@tanstack/react-router';
import { AudioLines } from 'lucide-react';
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
  isPlaying?: boolean;
  playingLabel?: string;
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
        {({ isActive }) => children(isActive || isSelected)}
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
  isPlaying = false,
  playingLabel,
}) => {
  const isCompact = useSidebarCompact();
  const tooltipLabel =
    isPlaying && playingLabel ? `${label} · ${playingLabel}` : label;

  return (
    <MaybeNavLink to={to} exact={exact} isSelected={isSelected}>
      {(active) => (
        <Tooltip content={tooltipLabel} side="right" disabled={!isCompact}>
          <div
            role={onClick ? 'button' : undefined}
            aria-label={isCompact ? tooltipLabel : undefined}
            onClick={onClick}
            data-testid="sidebar-navigation-item"
            className={cn(
              'group flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-transparent px-1.5 transition-colors duration-150',
              {
                'bg-primary/10 text-foreground hover:bg-primary/15':
                  isFeatured && !active,
                'bg-primary/10 text-foreground font-semibold':
                  isFeatured && active,
                'text-foreground/70 hover:bg-muted/70 hover:text-foreground':
                  !isFeatured && !active,
                'bg-muted text-foreground font-semibold': !isFeatured && active,
              },
              isCompact && 'h-9 min-h-9 justify-center gap-0 px-0',
            )}
          >
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center [&>svg]:size-[18px]',
                {
                  'text-primary': isFeatured || active,
                  'text-foreground/55 group-hover:text-foreground':
                    !isFeatured && !active,
                },
                isCompact &&
                  isPlaying &&
                  'ring-accent-green rounded-md ring-2 ring-inset',
              )}
            >
              {icon}
            </div>
            {!isCompact && (
              <span
                className={cn(
                  'min-w-0 truncate text-sm whitespace-nowrap',
                  isFeatured && 'font-semibold',
                )}
              >
                {label}
              </span>
            )}
            {isPlaying && !isCompact && (
              <span
                aria-label={playingLabel}
                className="text-accent-green mr-2 ml-auto flex shrink-0 animate-pulse items-center"
                data-testid="sidebar-playing-indicator"
              >
                <AudioLines size={16} />
              </span>
            )}
          </div>
        </Tooltip>
      )}
    </MaybeNavLink>
  );
};
