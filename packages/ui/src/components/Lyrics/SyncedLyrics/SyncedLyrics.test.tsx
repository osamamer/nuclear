import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

import type { LineSyncedLyrics } from '@nuclearplayer/model';

import { SyncedLyrics } from '.';

const LABELS = { currentLine: 'Current line' };

describe('SyncedLyrics', () => {
  it('scrolls partway to the next line before that line starts', () => {
    const viewportRef = createRef<HTMLDivElement>();
    const lyrics: LineSyncedLyrics = {
      type: 'lineSynced',
      metadata: {},
      sections: [
        {
          lines: [
            { startMs: 0, endMs: 4000, segments: [{ text: 'First line' }] },
            { startMs: 4000, endMs: 8000, segments: [{ text: 'Next line' }] },
          ],
        },
      ],
    };
    const renderAt = (positionMs: number) => (
      <div ref={viewportRef} data-testid="lyrics-viewport">
        <SyncedLyrics
          lyrics={lyrics}
          positionMs={positionMs}
          onSeek={() => {}}
          labels={LABELS}
          viewportRef={viewportRef}
          autoScroll
        />
      </div>
    );
    const { rerender } = render(renderAt(0));
    const viewport = screen.getByTestId('lyrics-viewport');
    vi.spyOn(viewport, 'clientHeight', 'get').mockReturnValue(100);
    vi.spyOn(
      screen.getByRole('button', { name: 'First line' }),
      'getBoundingClientRect',
    ).mockImplementation(() => new DOMRect(0, 60 - viewport.scrollTop));
    vi.spyOn(
      screen.getByRole('button', { name: 'Next line' }),
      'getBoundingClientRect',
    ).mockImplementation(() => new DOMRect(0, 140 - viewport.scrollTop));

    rerender(renderAt(1000));
    expect(viewport.scrollTop).toBe(50);

    rerender(renderAt(2000));
    expect(viewport.scrollTop).toBe(70);
  });

  it('(Snapshot) renders line synced lyrics', () => {
    const { container } = render(
      <SyncedLyrics
        positionMs={5000}
        onSeek={() => {}}
        labels={LABELS}
        viewportRef={createRef()}
        autoScroll
        lyrics={{
          type: 'lineSynced',
          metadata: {},
          sections: [
            {
              label: 'Verse 1',
              lines: [
                {
                  startMs: 0,
                  endMs: 4000,
                  segments: [{ text: 'Lorem ipsum dolor' }],
                },
                {
                  startMs: 4000,
                  endMs: 8000,
                  segments: [{ text: 'Sit amet' }],
                },
              ],
            },
            {
              label: 'Chorus',
              lines: [
                {
                  startMs: 8000,
                  endMs: 12000,
                  segments: [{ text: 'Consectetur adipiscing' }],
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('(Snapshot) renders word synced lyrics', () => {
    const { container } = render(
      <SyncedLyrics
        positionMs={750}
        onSeek={() => {}}
        labels={LABELS}
        viewportRef={createRef()}
        autoScroll
        lyrics={{
          type: 'wordSynced',
          metadata: {},
          sections: [
            {
              lines: [
                {
                  startMs: 0,
                  endMs: 2000,
                  segments: [
                    { text: 'Lorem ', startMs: 0, endMs: 500 },
                    { text: 'ipsum ', startMs: 500, endMs: 1000 },
                    { text: 'dolor', startMs: 1000, endMs: 2000 },
                  ],
                },
                {
                  startMs: 2000,
                  endMs: 4000,
                  segments: [
                    { text: 'Sit ', startMs: 2000, endMs: 3000 },
                    { text: 'amet', startMs: 3000, endMs: 4000 },
                  ],
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(container).toMatchSnapshot();
  });
});
