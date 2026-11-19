import * as Menu from '@radix-ui/react-menu';
import { ChevronRight } from 'lucide-react';
import { FC, ReactNode, useState } from 'react';

import { cn } from '../../utils';

type TrackContextMenuSubmenuProps = {
  children: ReactNode;
};

export const TrackContextMenuSubmenu: FC<TrackContextMenuSubmenuProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Menu.Sub open={isOpen} onOpenChange={setIsOpen}>
      {children}
    </Menu.Sub>
  );
};

type TrackContextMenuSubmenuTriggerProps = {
  icon?: ReactNode;
  children: ReactNode;
};

export const TrackContextMenuSubmenuTrigger: FC<
  TrackContextMenuSubmenuTriggerProps
> = ({ icon, children }) => (
  <Menu.SubTrigger
    className={cn(
      'flex w-full cursor-pointer items-center justify-between gap-3 border-t border-transparent px-3 py-2 text-left text-sm outline-none not-last:border-b',
      'data-[highlighted]:bg-muted data-[highlighted]:border-border',
    )}
    data-testid="submenu-trigger"
  >
    <span className="flex items-center gap-3">
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </span>
    <ChevronRight size={14} />
  </Menu.SubTrigger>
);

type TrackContextMenuSubmenuContentProps = {
  children: ReactNode;
};

export const TrackContextMenuSubmenuContent: FC<
  TrackContextMenuSubmenuContentProps
> = ({ children }) => (
  <Menu.Portal>
    <Menu.SubContent
      className="surface-background border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 shadow-shadow z-50 w-48 overflow-hidden rounded-sm border-(length:--border-width) backdrop-blur-xl outline-none"
      sideOffset={4}
      data-testid="submenu-content"
    >
      {children}
    </Menu.SubContent>
  </Menu.Portal>
);
