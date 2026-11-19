import { FC } from 'react';

import type { LyricsLine, LyricsSegment } from '@nuclearplayer/model';

import {
  LyricsAnnotations,
  LyricsBackgroundVocals,
  LyricsSegments,
} from '../LyricsLineParts';
import { getLyricsDirection } from '../utils';

type PlainLyricsLineProps = {
  line: LyricsLine<LyricsSegment>;
};

export const PlainLyricsLine: FC<PlainLyricsLineProps> = ({ line }) => (
  <div
    data-testid="lyrics-line"
    dir={getLyricsDirection(
      line.segments.map((segment) => segment.text).join(''),
    )}
    className="font-lyrics rtl:font-lyrics-arabic py-1 text-start tracking-tight rtl:tracking-normal"
  >
    <p>
      <LyricsSegments segments={line.segments} />
      {line.background && <LyricsBackgroundVocals segments={line.background} />}
    </p>
    {line.annotations && <LyricsAnnotations annotations={line.annotations} />}
  </div>
);
