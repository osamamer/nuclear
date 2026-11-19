import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useLayoutStore } from './stores/layoutStore';
import { useStartupStore } from './stores/startupStore';

export const AppWrapper = {
  async toggleLeftSidebar() {
    const leftToggle = screen.getByTestId('sidebar-toggle-left');
    if (!leftToggle) {
      throw new Error('Left toggle not found');
    }
    await userEvent.click(leftToggle);
  },

  async toggleRightSidebar() {
    const rightToggle = screen.getByTestId('sidebar-toggle-right');
    if (!rightToggle) {
      throw new Error('Right toggle not found');
    }
    if (rightToggle) {
      await userEvent.click(rightToggle);
    }
  },

  async toggleQueueVisibility() {
    await userEvent.click(screen.getByTestId('toggle-queue-panel-button'));
  },

  get queueVisibilityToggle() {
    return screen.getByTestId('toggle-queue-panel-button');
  },

  get queuePanel() {
    return screen.getByTestId('sidebar-right');
  },

  getLayoutState() {
    return useLayoutStore.getState();
  },

  resetState() {
    useLayoutStore.setState({
      leftSidebar: { isCollapsed: false, width: 200 },
      rightSidebar: { isCollapsed: false, isHidden: false, width: 200 },
    });
    useStartupStore.setState({ isStartingUp: false });
  },
};
