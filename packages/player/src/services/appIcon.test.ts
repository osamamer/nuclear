import { buildAppIconSvg } from './appIcon';

describe('buildAppIconSvg', () => {
  it('tints the trefoil with the accent color and a lighter highlight', () => {
    const svg = buildAppIconSvg('#ff0000');

    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#ff4d4d"');
  });
});
