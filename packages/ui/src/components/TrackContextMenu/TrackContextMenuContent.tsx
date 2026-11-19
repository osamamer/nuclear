import * as Menu from '@radix-ui/react-menu';
import { FC, ReactNode } from 'react';

import { useTrackContextMenu } from './context';

type TrackContextMenuContentProps = {
  children: ReactNode;
};

export const TrackContextMenuContent: FC<TrackContextMenuContentProps> = ({
  children,
}) => {
  const { pointer, triggerRef, triggerId, contentId } = useTrackContextMenu();

  return (
    <Menu.Portal>
      <Menu.Content
        id={contentId}
        aria-labelledby={triggerId}
        align={pointer ? 'start' : 'end'}
        sideOffset={4}
        collisionPadding={8}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        className="surface-popover border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 shadow-shadow z-50 w-56 origin-(--radix-popper-transform-origin) overflow-hidden rounded-sm border-(length:--border-width) backdrop-blur-xl outline-none"
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
};
