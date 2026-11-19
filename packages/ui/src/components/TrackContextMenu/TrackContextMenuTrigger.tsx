import { Slot } from '@radix-ui/react-slot';
import { FC, ReactNode } from 'react';

import { useTrackContextMenu } from './context';
import { TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE } from './openNearestTrackContextMenu';

type TrackContextMenuTriggerProps = {
  children: ReactNode;
};

export const TrackContextMenuTrigger: FC<TrackContextMenuTriggerProps> = ({
  children,
}) => {
  const { isOpen, open, triggerRef, triggerId, contentId } =
    useTrackContextMenu();

  return (
    <Slot
      ref={triggerRef}
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={isOpen ? contentId : undefined}
      data-state={isOpen ? 'open' : 'closed'}
      {...{ [TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE]: '' }}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          open();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY, button, ctrlKey } = event;
        open(button === 2 || ctrlKey ? { clientX, clientY } : undefined);
      }}
    >
      {children}
    </Slot>
  );
};
