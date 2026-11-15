import { useSoundStore } from '../stores/soundStore';

export const usePlaybackActivity = () => {
  const hasStartedPlayback = useSoundStore((state) => state.hasStartedPlayback);
  const isPaused = useSoundStore((state) => state.status !== 'playing');
  return { hasStartedPlayback, isPaused };
};
