import { PanelLeft, PanelRight } from 'lucide-react';
import { CSSProperties, FC, ReactNode } from 'react';

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
  const { handleMouseDown, isResizingState } = useSidebarResize(
    width,
    onWidthChange,
    side,
    isCollapsed,
  );

  const currentWidth = isCollapsed ? SIDEBAR_CONFIG.COLLAPSED_WIDTH : width;
  const reveal =
    !isCollapsed &&
    cn(
      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out',
      side === 'left'
        ? 'motion-safe:slide-in-from-left-2'
        : 'motion-safe:slide-in-from-right-2',
    );

  return (
    <div
      data-testid={`sidebar-${side}`}
      className={cn(
        'border-border relative flex min-h-0 flex-col overflow-clip',
        !isResizingState &&
          'transition-[width] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        {
          'surface-sidebar-left border-r-(length:--border-width)':
            side === 'left',
          'surface-sidebar-right border-l-(length:--border-width)':
            side === 'right',
        },
        className,
      )}
      style={
        {
          width: currentWidth,
          '--sidebar-content-width': `${currentWidth}px`,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          'flex h-full min-h-0 flex-col',
          side === 'left'
            ? 'w-[calc(var(--sidebar-content-width)-var(--border-width)-1rem)]'
            : 'w-[calc(var(--sidebar-content-width)-var(--border-width))] self-end',
        )}
      >
        <span
          className={cn(
            'mb-3 flex flex-row items-center gap-1 px-2 pt-2',
            side === 'right' && 'flex-row-reverse',
            isCollapsed && 'justify-center',
          )}
        >
          <Button
            data-testid={`sidebar-toggle-${side}`}
            aria-expanded={!isCollapsed}
            variant="text"
            className="text-foreground/60 hover:bg-muted/70 hover:text-foreground size-8 shrink-0 justify-center p-0 [&>svg]:size-4"
            size="icon-sm"
            onClick={onToggle}
          >
            {side === 'left' ? <PanelLeft /> : <PanelRight />}
          </Button>
          {!isCollapsed && headerActions && (
            <span
              className={cn(
                'flex flex-1 items-center justify-start gap-1',
                reveal,
              )}
            >
              {headerActions}
            </span>
          )}
        </span>
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden',
            !isCollapsed && 'px-2 pb-2',
            reveal,
          )}
        >
          {children}
        </div>

        {!isCollapsed && footer && (
          <div className={cn('shrink-0', reveal)}>{footer}</div>
        )}

        {persistentFooter && (
          <div className="mt-auto flex flex-col items-center gap-2 py-2">
            {persistentFooter}
          </div>
        )}
      </div>

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
