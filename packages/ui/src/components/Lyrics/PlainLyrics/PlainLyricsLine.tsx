import { FC } from 'react';

import type { LyricsLine, LyricsSegment } from '@nuclearplayer/model';

import {
  LyricsAnnotations,
  LyricsBackgroundVocals,
  LyricsSegments,
} from '../LyricsLineParts';

type PlainLyricsLineProps = {
  line: LyricsLine<LyricsSegment>;
};

export const PlainLyricsLine: FC<PlainLyricsLineProps> = ({ line }) => (
  <div data-testid="lyrics-line" dir="ltr" className="py-1 text-left">
    <p>
      <LyricsSegments segments={line.segments} />
      {line.background && <LyricsBackgroundVocals segments={line.background} />}
    </p>
    {line.annotations && <LyricsAnnotations annotations={line.annotations} />}
  </div>
);
