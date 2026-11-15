import { AnimatePresence, useMotionValue } from 'motion/react';
import { FC, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { CountdownBubble } from '@nuclearplayer/ui';

import {
  getCountdownRemainingMs,
  SkipCountdown,
  useSkipCountdownStore,
} from '../stores/skipCountdownStore';

const TICK_MS = 100;
const READY_VISIBLE_MS = 3000;

const countdownKey = (countdown: SkipCountdown | null): string | null =>
  countdown
    ? `${countdown.trackKey}:${countdown.deadlineMs}:${countdown.durationMs}`
    : null;

const useCountdownBubble = (countdown: SkipCountdown | null) => {
  const key = countdownKey(countdown);
  const [remainingMs, setRemainingMs] = useState(() =>
    countdown ? getCountdownRemainingMs(countdown) : 0,
  );
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!countdown || !key) {
      return;
    }

    let dismissTimeoutId: number | undefined;
    const tick = () => {
      const remaining = getCountdownRemainingMs(countdown);
      setRemainingMs(remaining);
      if (remaining > 0) {
        return;
      }
      window.clearInterval(intervalId);
      dismissTimeoutId = window.setTimeout(
        () => setDismissedKey(key),
        READY_VISIBLE_MS,
      );
    };
    const intervalId = window.setInterval(tick, TICK_MS);
    tick();

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(dismissTimeoutId);
    };
  }, [countdown, key]);

  return {
    isVisible: key !== null && dismissedKey !== key,
    remainingMs,
    durationMs: countdown?.durationMs ?? 0,
  };
};

type DraggableCountdownBubbleProps = {
  countdown: SkipCountdown | null;
  testId: string;
  countdownLabel: (seconds: number) => string;
  readyLabel: string;
};

const DraggableCountdownBubble: FC<DraggableCountdownBubbleProps> = ({
  countdown,
  testId,
  countdownLabel,
  readyLabel,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const { isVisible, remainingMs, durationMs } = useCountdownBubble(countdown);

  return (
    <AnimatePresence>
      {isVisible && (
        <CountdownBubble
          key={testId}
          data-testid={testId}
          className="pointer-events-auto"
          style={{ x, y }}
          remainingMs={remainingMs}
          durationMs={durationMs}
          label={
            remainingMs > 0
              ? countdownLabel(Math.ceil(remainingMs / 1000))
              : readyLabel
          }
        />
      )}
    </AnimatePresence>
  );
};

export const ConnectedSkipCountdownBubbles: FC = () => {
  const { t } = useTranslation('playerBar');
  const skipCountdown = useSkipCountdownStore((state) => state.skip);
  const forwardCountdown = useSkipCountdownStore((state) => state.forward);

  return (
    <div className="pointer-events-none fixed top-28 right-4 z-50 flex flex-col items-end gap-3">
      <DraggableCountdownBubble
        countdown={skipCountdown}
        testId="skip-countdown-bubble"
        countdownLabel={(seconds) => t('skipGate.countdown', { seconds })}
        readyLabel={t('skipGate.skipReady')}
      />
      <DraggableCountdownBubble
        countdown={forwardCountdown}
        testId="forward-countdown-bubble"
        countdownLabel={(seconds) =>
          t('skipGate.forwardCountdown', { seconds })
        }
        readyLabel={t('skipGate.forwardReady')}
      />
    </div>
  );
};
