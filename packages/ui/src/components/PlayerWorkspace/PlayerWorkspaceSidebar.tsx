import { PanelLeft, PanelRight } from 'lucide-react';
import { FC, ReactNode, useRef } from 'react';

import { cn } from '../../utils';
import { Button } from '../Button';
import { SIDEBAR_CONFIG } from './constants';
import { useSidebarResize } from './hooks';

export type PlayerWorkspaceSidebarPropsBase = {
  children?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  persistentFooter?: ReactNode;
  isCollapsed: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onToggle: () => void;
  className?: string;
};

type PlayerWorkspaceSidebarProps = PlayerWorkspaceSidebarPropsBase & {
  side: 'left' | 'right';
};

export const PlayerWorkspaceSidebar: FC<PlayerWorkspaceSidebarProps> = ({
  children,
  headerActions,
  footer,
  persistentFooter,
  isCollapsed,
  width,
  onWidthChange,
  onToggle,
  side,
  className = '',
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { handleMouseDown } = useSidebarResize(
    width,
    onWidthChange,
    side,
    isCollapsed,
  );

  const currentWidth = isCollapsed ? SIDEBAR_CONFIG.COLLAPSED_WIDTH : width;

  return (
    <div
      ref={sidebarRef}
      data-testid={`sidebar-${side}`}
      className={cn(
        'border-border relative flex flex-col overflow-hidden',
        {
          'surface-sidebar-left border-r-(length:--border-width)':
            side === 'left',
          'surface-sidebar-right border-l-(length:--border-width)':
            side === 'right',
        },
        className,
      )}
      style={{ width: currentWidth }}
    >
      <span
        className={cn('mb-3 flex flex-row items-center', {
          'justify-start px-2 pt-2': !isCollapsed,
          'justify-center py-2': isCollapsed,
        })}
      >
        <Button
          data-testid={`sidebar-toggle-${side}`}
          variant="text"
          className="text-foreground/60 hover:bg-muted/70 hover:text-foreground size-8 justify-center p-0 [&>svg]:size-4"
          size="icon-sm"
          onClick={onToggle}
        >
          {side === 'left' ? <PanelLeft /> : <PanelRight />}
        </Button>
        {!isCollapsed && headerActions && (
          <span className="flex flex-1 items-center justify-end gap-1">
            {headerActions}
          </span>
        )}
      </span>
      <div
        className={cn('flex flex-1 flex-col overflow-hidden', {
          'px-2 pb-2': !isCollapsed,
        })}
      >
        {children}
      </div>

      {!isCollapsed && footer}

      {persistentFooter && (
        <div className="mt-auto flex flex-col items-center gap-2 py-2">
          {persistentFooter}
        </div>
      )}

      {!isCollapsed && (
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 cursor-col-resize transition-colors',
            side === 'left' ? 'right-0' : 'left-0',
          )}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};
