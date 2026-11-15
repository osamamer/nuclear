import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';

import { useSkipFeedbackStore } from '../stores/skipFeedbackStore';

const SHAKE_DURATION_MS = 360;

export const useSkipFeedback = (): boolean => {
  const { t } = useTranslation('playerBar');
  const { t: tPrefs } = useTranslation('preferences');
  const sequence = useSkipFeedbackStore((state) => state.sequence);
  const feedback = useSkipFeedbackStore((state) => state.feedback);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (sequence === 0 || !feedback) {
      return;
    }

    switch (feedback.kind) {
      case 'blacklisted':
        toast.warning(tPrefs('blacklist.refusal.blacklisted'));
        return;
      case 'forwardUsed':
        toast.info(t('skipGate.forwardUsed'));
        return;
      case 'rewindUsed':
        toast.info(t('skipGate.rewindUsed'));
        return;
      case 'rewindRefused':
        toast.warning(t('skipGate.rewindRefused'));
        break;
      case 'forwardWaiting':
        toast.warning(
          t('skipGate.forwardWaiting', { seconds: feedback.remainingSeconds }),
        );
        break;
      case 'forwardRefused':
        toast.warning(t('skipGate.forwardRefused'));
        break;
      case 'skipRefused':
        break;
    }

    setIsShaking(false);
    const frameId = requestAnimationFrame(() => setIsShaking(true));
    const timeoutId = window.setTimeout(
      () => setIsShaking(false),
      SHAKE_DURATION_MS,
    );

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [feedback, sequence, t, tPrefs]);

  return isShaking;
};
