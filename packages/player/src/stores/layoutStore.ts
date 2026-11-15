import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutState = {
  leftSidebar: {
    isCollapsed: boolean;
    width: number;
  };
  rightSidebar: {
    isCollapsed: boolean;
    isHidden: boolean;
    width: number;
  };
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleRightSidebarVisibility: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  hiddenSidebarItems: string[];
  playlistsExpanded: boolean;
  togglePlaylistsExpanded: () => void;
  setSidebarItemVisible: (id: string, isVisible: boolean) => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftSidebar: {
        isCollapsed: false,
        width: 200,
      },
      rightSidebar: {
        isCollapsed: false,
        isHidden: false,
        width: 200,
      },
      hiddenSidebarItems: [],
      playlistsExpanded: false,
      togglePlaylistsExpanded: () =>
        set((state) => ({ playlistsExpanded: !state.playlistsExpanded })),
      toggleLeftSidebar: () =>
        set((state) => ({
          leftSidebar: {
            ...state.leftSidebar,
            isCollapsed: !state.leftSidebar.isCollapsed,
          },
        })),
      toggleRightSidebar: () =>
        set((state) => ({
          rightSidebar: {
            ...state.rightSidebar,
            isCollapsed: !state.rightSidebar.isCollapsed,
          },
        })),
      toggleRightSidebarVisibility: () =>
        set((state) => ({
          rightSidebar: {
            ...state.rightSidebar,
            isHidden: !state.rightSidebar.isHidden,
          },
        })),
      setLeftSidebarWidth: (width: number) =>
        set((state) => ({
          leftSidebar: {
            ...state.leftSidebar,
            width,
          },
        })),
      setRightSidebarWidth: (width: number) =>
        set((state) => ({
          rightSidebar: {
            ...state.rightSidebar,
            width,
          },
        })),
      setSidebarItemVisible: (id, isVisible) =>
        set((state) => ({
          hiddenSidebarItems: isVisible
            ? state.hiddenSidebarItems.filter((itemId) => itemId !== id)
            : [...new Set([...state.hiddenSidebarItems, id])],
        })),
    }),
    {
      name: 'nuclear-layout-store',
    },
  ),
);
