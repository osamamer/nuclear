import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FC, ReactNode } from 'react';

import { useTrackContextMenu } from './context';
import { TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE } from './openNearestTrackContextMenu';

type TrackContextMenuTriggerProps = {
  children: ReactNode;
};

export const TrackContextMenuTrigger: FC<TrackContextMenuTriggerProps> = ({
  children,
}) => {
  const { open } = useTrackContextMenu();

  return (
    <DropdownMenu.Trigger
      asChild
      {...{ [TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE]: '' }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        open();
      }}
    >
      {children}
    </DropdownMenu.Trigger>
  );
};
