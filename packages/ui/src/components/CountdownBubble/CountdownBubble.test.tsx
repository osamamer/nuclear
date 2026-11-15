import { render, screen } from '@testing-library/react';

import { CountdownBubble } from './CountdownBubble';

describe('CountdownBubble', () => {
  it('(Snapshot) renders a running countdown', () => {
    const { container } = render(
      <CountdownBubble
        remainingMs={3200}
        durationMs={5000}
        label="Skip unlocks in 4 seconds"
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('(Snapshot) renders the ready state', () => {
    const { container } = render(
      <CountdownBubble
        remainingMs={0}
        durationMs={5000}
        label="Skip allowed"
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('shows the remaining seconds rounded up while counting down', () => {
    render(
      <CountdownBubble
        remainingMs={3200}
        durationMs={5000}
        label="Skip unlocks in 4 seconds"
      />,
    );
    expect(screen.getByTestId('countdown-bubble-seconds')).toHaveTextContent(
      '4',
    );
    expect(screen.getByTestId('countdown-bubble')).toHaveAttribute(
      'data-ready',
      'false',
    );
  });

  it('hides the seconds and marks itself ready once the countdown ends', () => {
    render(
      <CountdownBubble
        remainingMs={0}
        durationMs={5000}
        label="Skip allowed"
      />,
    );
    expect(
      screen.getByRole('status', { name: 'Skip allowed' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('countdown-bubble')).toHaveAttribute(
      'data-ready',
      'true',
    );
    expect(screen.queryByTestId('countdown-bubble-seconds')).toBeNull();
  });
});
