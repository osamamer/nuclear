import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkipCountdownStore } from '../stores/skipCountdownStore';
import { ConnectedSkipCountdownBubbles } from './ConnectedSkipCountdownBubbles';

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('ConnectedSkipCountdownBubbles', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useSkipCountdownStore.setState({ skip: null, forward: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing while no countdown is running', () => {
    render(<ConnectedSkipCountdownBubbles />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('counts down in red, turns green when ready, and hides three seconds later', async () => {
    render(<ConnectedSkipCountdownBubbles />);
    act(() => {
      useSkipCountdownStore.getState().setSkip({
        trackKey: 'track',
        deadlineMs: Date.now() + 5000,
        durationMs: 5000,
      });
    });

    const bubble = screen.getByTestId('skip-countdown-bubble');
    expect(bubble).toHaveAttribute('data-ready', 'false');
    expect(within(bubble).getByText('5')).toBeInTheDocument();

    await advance(2100);
    expect(within(bubble).getByText('3')).toBeInTheDocument();

    await advance(3000);
    expect(
      screen.getByRole('status', { name: 'Skip allowed' }),
    ).toBeInTheDocument();
    expect(bubble).toHaveAttribute('data-ready', 'true');

    await advance(3000);
    await waitFor(() =>
      expect(screen.queryByTestId('skip-countdown-bubble')).toBeNull(),
    );
  });

  it('shows the fast-forward countdown in its own bubble', () => {
    render(<ConnectedSkipCountdownBubbles />);
    act(() => {
      useSkipCountdownStore.getState().setForward({
        trackKey: 'track',
        deadlineMs: Date.now() + 10_000,
        durationMs: 10_000,
      });
    });

    expect(
      screen.getByRole('status', {
        name: 'Fast-forward unlocks in 10 seconds',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('skip-countdown-bubble')).toBeNull();
  });

  it('hides straight away when the countdown is cleared', async () => {
    render(<ConnectedSkipCountdownBubbles />);
    act(() => {
      useSkipCountdownStore.getState().setSkip({
        trackKey: 'track',
        deadlineMs: Date.now() + 5000,
        durationMs: 5000,
      });
    });
    act(() => useSkipCountdownStore.getState().setSkip(null));

    await waitFor(() =>
      expect(screen.queryByTestId('skip-countdown-bubble')).toBeNull(),
    );
  });
});
