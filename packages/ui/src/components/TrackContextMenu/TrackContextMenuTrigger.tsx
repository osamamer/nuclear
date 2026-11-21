import { Slot } from '@radix-ui/react-slot';
import { FC, ReactNode } from 'react';

import { useTrackContextMenu } from './context';
import { TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE } from './openNearestTrackContextMenu';

type TrackContextMenuTriggerProps = {
  children: ReactNode;
  contextOnly?: boolean;
};

export const TrackContextMenuTrigger: FC<TrackContextMenuTriggerProps> = ({
  children,
  contextOnly = false,
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
        if (contextOnly) {
          return;
        }
        event.stopPropagation();
        open();
      }}
      onKeyDown={(event) => {
        if (
          (!contextOnly && event.key === 'ArrowDown') ||
          (contextOnly &&
            (event.key === 'ContextMenu' ||
              (event.shiftKey && event.key === 'F10')))
        ) {
          event.preventDefault();
          event.stopPropagation();
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
