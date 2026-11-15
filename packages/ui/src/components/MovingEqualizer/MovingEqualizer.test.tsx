import { render, screen } from '@testing-library/react';

import { MovingEqualizer } from './MovingEqualizer';

describe('MovingEqualizer', () => {
  it('(Snapshot) renders the small equalizer', () => {
    const { container } = render(<MovingEqualizer />);
    expect(container).toMatchSnapshot();
  });

  it('(Snapshot) renders the medium equalizer', () => {
    const { container } = render(<MovingEqualizer size="md" />);
    expect(container).toMatchSnapshot();
  });

  it('renders four animated bars with staggered timing', () => {
    render(<MovingEqualizer />);

    const bars = screen.getAllByTestId('moving-equalizer-bar');
    expect(bars).toHaveLength(4);
    expect(bars.map((bar) => bar.style.animationDelay)).toEqual([
      '-0.45s',
      '-0.15s',
      '-0.6s',
      '-0.3s',
    ]);
  });

  it('is hidden from assistive technology', () => {
    render(<MovingEqualizer />);

    expect(screen.getByTestId('moving-equalizer')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
