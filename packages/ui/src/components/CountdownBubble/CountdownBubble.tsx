import { CheckIcon } from 'lucide-react';
import { HTMLMotionProps, motion } from 'motion/react';
import { FC } from 'react';

import { cn } from '../../utils';

const RING_RADIUS = 23;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type CountdownBubbleProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
  remainingMs: number;
  durationMs: number;
  label: string;
};

export const CountdownBubble: FC<CountdownBubbleProps> = ({
  remainingMs,
  durationMs,
  label,
  className,
  ...props
}) => {
  const isReady = remainingMs <= 0;
  const progress =
    durationMs > 0 ? Math.min(Math.max(remainingMs / durationMs, 0), 1) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return (
    <motion.div
      data-testid="countdown-bubble"
      data-ready={isReady}
      drag
      dragMomentum={false}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'border-border shadow-shadow relative flex size-15 cursor-grab touch-none items-center justify-center rounded-full border-(length:--border-width) text-white transition-colors duration-250 select-none active:cursor-grabbing',
        isReady ? 'bg-accent-green' : 'bg-accent-red',
        className,
      )}
      {...props}
    >
      <div
        role="status"
        aria-label={label}
        className="flex size-full items-center justify-center"
      >
        {isReady ? (
          <CheckIcon className="size-7" strokeWidth={3} aria-hidden />
        ) : (
          <>
            <svg
              className="absolute inset-0 m-auto size-13 -rotate-90"
              viewBox="0 0 52 52"
              aria-hidden
            >
              <circle
                cx="26"
                cy="26"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={3}
              />
              <circle
                cx="26"
                cy="26"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
              />
            </svg>
            <span
              className="font-heading relative text-xl font-bold"
              data-testid="countdown-bubble-seconds"
            >
              {remainingSeconds}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
};
