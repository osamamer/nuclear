import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import App from './App';
import { AppWrapper } from './App.test-wrapper';

describe('App', () => {
  beforeEach(() => {
    AppWrapper.resetState();
  });

  it('should render snapshot', async () => {
    const component = render(<App queryClientProp={new QueryClient()} />);
    await screen.findByTestId('player-workspace-main');
    expect(component.asFragment()).toMatchSnapshot();
  });

  it('should handle sidebar collapse/expand user flow', async () => {
    render(<App queryClientProp={new QueryClient()} />);

    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(false);
    expect(AppWrapper.getLayoutState().rightSidebar.isCollapsed).toBe(false);

    await AppWrapper.toggleLeftSidebar();
    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(true);
    expect(AppWrapper.getLayoutState().rightSidebar.isCollapsed).toBe(false);

    await AppWrapper.toggleRightSidebar();
    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(true);
    expect(AppWrapper.getLayoutState().rightSidebar.isCollapsed).toBe(true);

    await AppWrapper.toggleLeftSidebar();
    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(false);
    expect(AppWrapper.getLayoutState().rightSidebar.isCollapsed).toBe(true);

    await AppWrapper.toggleRightSidebar();
    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(false);
    expect(AppWrapper.getLayoutState().rightSidebar.isCollapsed).toBe(false);

    await AppWrapper.toggleLeftSidebar();
    await AppWrapper.toggleLeftSidebar();
    expect(AppWrapper.getLayoutState().leftSidebar.isCollapsed).toBe(false);
  });

  it('hides and restores the queue from the playback bar', async () => {
    render(<App queryClientProp={new QueryClient()} />);

    expect(AppWrapper.queueVisibilityToggle).toHaveAccessibleName(
      'Hide queue panel',
    );
    await AppWrapper.toggleQueueVisibility();
    expect(AppWrapper.queueVisibilityToggle).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(AppWrapper.queueVisibilityToggle).toHaveAccessibleName(
      'Show queue panel',
    );
    await AppWrapper.toggleQueueVisibility();
    expect(AppWrapper.queuePanel).toBeVisible();
  });
});
