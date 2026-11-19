import { FC } from 'react';

import type { LineAnnotation } from '@nuclearplayer/model';

import { getLyricsDirection } from '../utils';

export const LyricsAnnotations: FC<{ annotations: LineAnnotation[] }> = ({
  annotations,
}) =>
  annotations.map((annotation, index) => (
    <span
      key={index}
      data-testid="lyrics-annotation"
      data-type={annotation.type}
      lang={annotation.language}
      dir={getLyricsDirection(annotation.text)}
      className="rtl:font-lyrics-arabic block text-start font-sans text-base font-normal tracking-normal opacity-60"
    >
      {annotation.text}
    </span>
  ));
