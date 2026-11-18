import { createContext, useContext } from 'react';

type TrackContextMenuState = {
  open: () => void;
};

export const TrackContextMenuContext = createContext<TrackContextMenuState>({
  open: () => {},
});

export const useTrackContextMenu = () => useContext(TrackContextMenuContext);
