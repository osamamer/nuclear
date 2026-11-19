import { ComponentProps, FC } from 'react';

import { cn } from '../../../utils';

type LyricsHighlighterProps = ComponentProps<'span'> & {
  progress: number;
};

export const LyricsHighlighter: FC<LyricsHighlighterProps> = ({
  progress,
  className,
  ...props
}) => (
  <span
    className={cn(
      'from-primary to-primary bg-linear-to-r bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-linear rtl:bg-right-bottom',
      className,
    )}
    style={{ backgroundSize: `${progress * 100}% 0.1em` }}
    {...props}
  />
);
