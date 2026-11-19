import { createContext, RefObject, useContext } from 'react';

export type MenuPoint = { clientX: number; clientY: number };

type TrackContextMenuState = {
  isOpen: boolean;
  pointer: MenuPoint | undefined;
  triggerId: string;
  contentId: string;
  triggerRef: RefObject<HTMLElement>;
  open: (point?: MenuPoint) => void;
};

export const TrackContextMenuContext =
  createContext<TrackContextMenuState | null>(null);

export const useTrackContextMenu = () => useContext(TrackContextMenuContext)!;
