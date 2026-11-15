import { cva, VariantProps } from 'class-variance-authority';
import { ComponentProps, FC } from 'react';

import { cn } from '../../utils';

const BAR_DELAYS = ['-0.45s', '-0.15s', '-0.6s', '-0.3s'];

const movingEqualizerVariants = cva('inline-flex items-end', {
  variants: {
    size: {
      sm: 'h-3 gap-[2px]',
      md: 'h-4 gap-[3px]',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

const barVariants = cva(
  'animate-eq-bar h-full origin-bottom rounded-full bg-current',
  {
    variants: {
      size: {
        sm: 'w-[2px]',
        md: 'w-[3px]',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
);

type MovingEqualizerProps = ComponentProps<'span'> &
  VariantProps<typeof movingEqualizerVariants> & {
    isPaused?: boolean;
  };

export const MovingEqualizer: FC<MovingEqualizerProps> = ({
  className,
  size,
  isPaused = false,
  ...props
}) => (
  <span
    aria-hidden="true"
    data-testid="moving-equalizer"
    data-paused={isPaused}
    className={cn(movingEqualizerVariants({ size, className }))}
    {...props}
  >
    {BAR_DELAYS.map((delay) => (
      <span
        key={delay}
        data-testid="moving-equalizer-bar"
        className={cn(
          barVariants({ size }),
          isPaused && '[animation-play-state:paused]',
        )}
        style={{ animationDelay: delay }}
      />
    ))}
  </span>
);
