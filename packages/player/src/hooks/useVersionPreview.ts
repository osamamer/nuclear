import { useCallback, useEffect, useRef, useState } from 'react';

import type { AudioSource } from '@nuclearplayer/hifi';
import type { StreamCandidate } from '@nuclearplayer/model';

import { Logger } from '../services/logger';
import { playbackManager } from '../services/playback';
import { AudioSourceFactory } from '../services/streamResolution/audioSource';
import { resolveVersionPreview } from '../services/versions/trackVersions';
import { useSoundStore } from '../stores/soundStore';

const audioSourceFactory = new AudioSourceFactory();

type PreviewState = {
  candidateId: string | null;
  source: AudioSource | null;
  isLoading: boolean;
  position: number;
  duration: number;
};

const IDLE: PreviewState = {
  candidateId: null,
  source: null,
  isLoading: false,
  position: 0,
  duration: 0,
};

export const useVersionPreview = () => {
  const [state, setState] = useState<PreviewState>(IDLE);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const resolvedRef = useRef(new Map<string, StreamCandidate>());
  const requestRef = useRef(0);
  const pausedMainRef = useRef(false);
  const keepMainPausedRef = useRef(false);
  const { candidateId } = state;

  const pauseMainPlayback = () => {
    if (useSoundStore.getState().status === 'playing') {
      playbackManager.pause();
      pausedMainRef.current = true;
    }
  };

  const stop = useCallback(() => {
    requestRef.current += 1;
    setState(IDLE);
  }, []);

  const start = useCallback(
    async (candidate: StreamCandidate) => {
      if (candidateId === candidate.id) {
        return;
      }

      const request = ++requestRef.current;
      setFailedIds((current) => current.filter((id) => id !== candidate.id));
      setState({ ...IDLE, candidateId: candidate.id, isLoading: true });
      pauseMainPlayback();

      try {
        const resolved =
          resolvedRef.current.get(candidate.id) ??
          (await resolveVersionPreview(candidate));
        resolvedRef.current.set(candidate.id, resolved);
        const source = await audioSourceFactory.fromCandidate(resolved);
        if (request !== requestRef.current) {
          return;
        }
        setState((current) => ({ ...current, source, isLoading: false }));
      } catch (error) {
        Logger.streaming.warn(
          `Failed to preview version ${candidate.id}: ${String(error)}`,
        );
        if (request !== requestRef.current) {
          return;
        }
        setFailedIds((current) => [...current, candidate.id]);
        setState(IDLE);
      }
    },
    [candidateId],
  );

  const toggle = (candidate: StreamCandidate) => {
    if (candidateId === candidate.id) {
      stop();
    } else {
      void start(candidate);
    }
  };

  const failCurrent = useCallback(() => {
    if (candidateId) {
      setFailedIds((current) => [...current, candidateId]);
      resolvedRef.current.delete(candidateId);
    }
    stop();
  }, [candidateId, stop]);

  const updateProgress = useCallback(
    ({ position, duration }: { position: number; duration: number }) => {
      setState((current) => ({ ...current, position, duration }));
    },
    [],
  );

  const resolvedCandidate = useCallback(
    (candidate: StreamCandidate): StreamCandidate =>
      resolvedRef.current.get(candidate.id) ?? candidate,
    [],
  );

  const keepMainPaused = useCallback(() => {
    keepMainPausedRef.current = true;
  }, []);

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (pausedMainRef.current && !keepMainPausedRef.current) {
        playbackManager.play();
      }
    },
    [],
  );

  return {
    ...state,
    failedIds,
    start,
    toggle,
    stop,
    failCurrent,
    updateProgress,
    resolvedCandidate,
    keepMainPaused,
  };
};
