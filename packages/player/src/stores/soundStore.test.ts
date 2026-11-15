import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playbackManager } from '../services/playback';
import { resetSkipGates } from '../services/skipGate';
import { resetInMemoryTauriStore } from '../test/utils/inMemoryTauriStore';
import { createMockTrack } from '../test/utils/mockTrack';
import { useQueueStore } from './queueStore';
import { useSettingsStore } from './settingsStore';
import { useSkipCountdownStore } from './skipCountdownStore';
import { useSkipFeedbackStore } from './skipFeedbackStore';
import { useSoundStore } from './soundStore';

vi.mock('../services/skipRefusalSound', () => ({
  playSkipRefusalSound: vi.fn(),
}));

const advanceSeconds = (seconds: number) =>
  vi.setSystemTime(Date.now() + seconds * 1000);
const seek = () => useSoundStore.getState().seek;
const feedback = () => useSkipFeedbackStore.getState().feedback;

describe('seeking limits', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2025, 1, 1));
    resetInMemoryTauriStore();
    resetSkipGates();
    useSettingsStore.setState({ values: {} });
    useQueueStore.setState({ items: [], currentIndex: 0 });
    useQueueStore
      .getState()
      .addToQueue([createMockTrack('Track 1'), createMockTrack('Track 2')]);
    useSoundStore.setState({
      status: 'playing',
      pausedAt: null,
      seek: 60,
      duration: 240,
    });
  });

  it('treats tiny moves as slider jitter and always allows them', () => {
    useSoundStore.getState().seekTo(61.5);
    useSoundStore.getState().seekTo(60);
    useSoundStore.getState().seekTo(61);
    expect(seek()).toBe(61);
  });

  it('allows one rewind per song and refuses the rest', () => {
    useSoundStore.getState().seekTo(30);
    expect(seek()).toBe(30);
    expect(feedback()).toEqual({ kind: 'rewindUsed' });

    useSoundStore.getState().seekTo(10);
    expect(seek()).toBe(30);
    expect(feedback()).toEqual({ kind: 'rewindRefused' });
  });

  it('refuses the first fast-forward without starting the forward countdown', () => {
    useSoundStore.getState().seekTo(120);

    expect(seek()).toBe(60);
    expect(feedback()).toEqual({ kind: 'forwardFirstRefused' });
    expect(useSkipCountdownStore.getState().forward).toBeNull();
  });

  it('makes the second fast-forward attempt start the ten-second wait', () => {
    useSoundStore.getState().seekTo(120);
    useSoundStore.getState().seekTo(120);

    expect(seek()).toBe(60);
    expect(feedback()).toEqual({
      kind: 'forwardWaiting',
      remainingSeconds: 10,
    });
    expect(useSkipCountdownStore.getState().forward?.deadlineMs).toBe(
      Date.now() + 10_000,
    );

    advanceSeconds(4);
    useSoundStore.getState().seekTo(120);
    expect(seek()).toBe(60);
    expect(feedback()).toEqual({ kind: 'forwardWaiting', remainingSeconds: 6 });
  });

  it('allows a single fast-forward once the wait is over', () => {
    useSoundStore.getState().seekTo(120);
    useSoundStore.getState().seekTo(120);
    advanceSeconds(10);

    useSoundStore.getState().seekTo(120);
    expect(seek()).toBe(120);
    expect(feedback()).toEqual({ kind: 'forwardUsed' });
    expect(useSkipCountdownStore.getState().forward).toBeNull();

    useSoundStore.getState().seekTo(200);
    expect(seek()).toBe(120);
    expect(feedback()).toEqual({ kind: 'forwardRefused' });
  });

  it('gives each new song a fresh rewind and fast-forward budget', () => {
    useSoundStore.getState().seekTo(30);
    useSoundStore.getState().seekTo(120);
    useQueueStore.getState().goToNext('automatic');
    useSoundStore.setState({ status: 'playing', seek: 60, duration: 240 });

    useSoundStore.getState().seekTo(30);
    expect(seek()).toBe(30);
    expect(useSkipCountdownStore.getState().forward).toBeNull();
  });

  it('applies the same limits to plugins and remote clients', async () => {
    const { playbackHost } = await import('../services/playbackHost');

    await playbackHost.seekTo(30);
    await playbackHost.seekTo(10);

    expect(seek()).toBe(30);
  });

  it('restarts a song on repeat-one without spending a rewind', () => {
    useSettingsStore.setState({ values: { 'core.playback.repeat': 'one' } });
    useSoundStore.getState().seekTo(30);

    playbackManager.finishTrack();
    expect(seek()).toBe(0);

    useSoundStore.setState({ seek: 60 });
    useSoundStore.getState().seekTo(30);
    expect(seek()).toBe(30);
  });
});
