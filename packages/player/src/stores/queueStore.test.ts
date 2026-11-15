import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playbackManager } from '../services/playback';
import { resetSkipGates } from '../services/skipGate';
import { createMockCandidate } from '../test/builders/StreamingProviderBuilder';
import { resetInMemoryTauriStore } from '../test/utils/inMemoryTauriStore';
import { createMockTrack } from '../test/utils/mockTrack';
import { initializeQueueStore, useQueueStore } from './queueStore';
import { useSettingsStore } from './settingsStore';
import { useSkipCountdownStore } from './skipCountdownStore';
import { useSkipFeedbackStore } from './skipFeedbackStore';
import { useSoundStore } from './soundStore';

vi.mock('../services/skipRefusalSound', () => ({
  playSkipRefusalSound: vi.fn(),
}));

describe('useQueueStore', () => {
  beforeEach(() => {
    const date = new Date(2025, 1, 1);
    vi.setSystemTime(date);
    resetInMemoryTauriStore();
    resetSkipGates();
    useQueueStore.setState({
      items: [],
      currentIndex: 0,
      isReady: false,
      isLoading: false,
    });
    useSettingsStore.setState({ values: {} });
    useSoundStore.setState({ status: 'stopped', pausedAt: null, seek: 0 });
  });

  describe('initial state', () => {
    it('starts empty and not ready', () => {
      const state = useQueueStore.getState();
      expect(state.items).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isReady).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addToQueue', () => {
    it('appends tracks to the end', () => {
      const tracks = [createMockTrack('Track 1'), createMockTrack('Track 2')];
      useQueueStore.getState().addToQueue(tracks);

      const state = useQueueStore.getState();
      expect(state.items).toMatchSnapshot();
    });

    it('creates items with default status and metadata', () => {
      const track = createMockTrack('Test');
      useQueueStore.getState().addToQueue([track]);

      const state = useQueueStore.getState();
      expect(state.items).toMatchSnapshot();
    });
  });

  describe('addNext', () => {
    it('inserts tracks after current index', () => {
      const initial = [
        createMockTrack('Track 1'),
        createMockTrack('Track 2'),
        createMockTrack('Track 3'),
      ];
      useQueueStore.getState().addToQueue(initial);
      useQueueStore.setState({ currentIndex: 1 });

      useQueueStore.getState().addNext([createMockTrack('New Track')]);

      const state = useQueueStore.getState();
      expect(state.items).toHaveLength(4);
      expect(state.items[2].track.title).toBe('New Track');
      expect(state.items[3].track.title).toBe('Track 3');
    });
  });

  describe('addAt', () => {
    it('inserts tracks at specified index', () => {
      useQueueStore
        .getState()
        .addToQueue([createMockTrack('A'), createMockTrack('C')]);

      useQueueStore.getState().addAt([createMockTrack('B')], 1);

      const titles = useQueueStore
        .getState()
        .items.map((item) => item.track.title);
      expect(titles).toEqual(['A', 'B', 'C']);
    });

    it('adjusts currentIndex when inserting before it', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);
      useQueueStore.setState({ currentIndex: 2 });

      useQueueStore.getState().addAt([createMockTrack('X')], 1);

      expect(useQueueStore.getState().currentIndex).toBe(3);
    });
  });

  describe('removeByIds', () => {
    it('removes items by their IDs', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);
      const ids = useQueueStore.getState().items.map((item) => item.id);

      useQueueStore.getState().removeByIds([ids[1]]);

      const state = useQueueStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.items[0].track.title).toBe('A');
      expect(state.items[1].track.title).toBe('C');
    });

    it('adjusts currentIndex when removing items before it', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);
      useQueueStore.setState({ currentIndex: 2 });
      const ids = useQueueStore.getState().items.map((item) => item.id);

      useQueueStore.getState().removeByIds([ids[0], ids[1]]);

      expect(useQueueStore.getState().currentIndex).toBe(0);
    });
  });

  describe('removeByIndices', () => {
    it('removes items by their indices', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);

      useQueueStore.getState().removeByIndices([0, 2]);

      const state = useQueueStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].track.title).toBe('B');
    });
  });

  describe('clearQueue', () => {
    it('removes all items and resets index', () => {
      useQueueStore
        .getState()
        .addToQueue([createMockTrack('A'), createMockTrack('B')]);
      useQueueStore.setState({ currentIndex: 1 });

      useQueueStore.getState().clearQueue();

      const state = useQueueStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.currentIndex).toBe(0);
    });
  });

  describe('reorder', () => {
    it('moves item from one position to another and updates the current index', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);

      useQueueStore.getState().reorder(0, 2);

      const titles = useQueueStore
        .getState()
        .items.map((item) => item.track.title);
      expect(titles).toEqual(['B', 'C', 'A']);
      expect(useQueueStore.getState().currentIndex).toBe(2);
    });

    it('adjusts currentIndex when moving item across it', () => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('A'),
          createMockTrack('B'),
          createMockTrack('C'),
        ]);
      useQueueStore.setState({ currentIndex: 1 });

      useQueueStore.getState().reorder(0, 2);

      expect(useQueueStore.getState().currentIndex).toBe(0);
    });
  });

  describe('moveBefore', () => {
    const addTracks = (...titles: string[]) => {
      useQueueStore
        .getState()
        .addToQueue(titles.map((title) => createMockTrack(title)));
      return useQueueStore.getState().items.map((item) => item.id);
    };

    const titles = () =>
      useQueueStore.getState().items.map((item) => item.track.title);

    it('moves an item in front of another item', () => {
      const [idA, , idC] = addTracks('A', 'B', 'C');

      useQueueStore.getState().moveBefore(idC, idA);

      expect(titles()).toEqual(['C', 'A', 'B']);
    });

    it('moves an item to the end when there is no item to move it before', () => {
      const [idA] = addTracks('A', 'B', 'C');

      useQueueStore.getState().moveBefore(idA, null);

      expect(titles()).toEqual(['B', 'C', 'A']);
    });

    it('keeps the current item current when other items move around it', () => {
      const [idA, idB] = addTracks('A', 'B', 'C');
      useQueueStore.setState({ currentIndex: 1 });

      useQueueStore.getState().moveBefore(idA, null);

      expect(useQueueStore.getState().getCurrentItem()?.id).toBe(idB);
    });

    it('keeps the current item current when it is the item that moves', () => {
      const [idA, , idC] = addTracks('A', 'B', 'C');

      useQueueStore.getState().moveBefore(idA, idC);

      expect(titles()).toEqual(['B', 'A', 'C']);
      expect(useQueueStore.getState().getCurrentItem()?.id).toBe(idA);
    });

    it('leaves the queue unchanged when the item to move is not in the queue', () => {
      const [idA] = addTracks('A', 'B', 'C');

      useQueueStore.getState().moveBefore('missing', idA);

      expect(titles()).toEqual(['A', 'B', 'C']);
    });

    it('moves an item to the end when the item to move it before is not in the queue', () => {
      const [idA] = addTracks('A', 'B', 'C');

      useQueueStore.getState().moveBefore(idA, 'missing');

      expect(titles()).toEqual(['B', 'C', 'A']);
    });
  });

  describe('updateItemState', () => {
    it('updates specific item properties', () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track')]);
      const itemId = useQueueStore.getState().items[0].id;

      useQueueStore.getState().updateItemState(itemId, {
        status: 'loading',
      });

      const item = useQueueStore.getState().items[0];
      expect(item.status).toBe('loading');
    });
  });

  describe('updateCandidate', () => {
    it('does nothing when the item is no longer in the queue', () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track')]);
      const stateBefore = useQueueStore.getState();

      useQueueStore
        .getState()
        .updateCandidate('missing-id', createMockCandidate('c1', 'Stream 1'));

      expect(useQueueStore.getState()).toEqual(stateBefore);
    });
  });

  describe('removeCandidate', () => {
    it('removes the matching candidate from the item', () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track')]);
      const itemId = useQueueStore.getState().items[0].id;
      useQueueStore.getState().updateItemState(itemId, {
        track: {
          ...useQueueStore.getState().items[0].track,
          streamCandidates: [
            createMockCandidate('c1', 'Stream 1'),
            createMockCandidate('c2', 'Stream 2'),
          ],
        },
      });

      useQueueStore.getState().removeCandidate(itemId, 'c1');

      const item = useQueueStore.getState().items[0];
      expect(item.track.streamCandidates).toEqual([
        createMockCandidate('c2', 'Stream 2'),
      ]);
    });

    it('does nothing when the item is no longer in the queue', () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track')]);
      const stateBefore = useQueueStore.getState();

      useQueueStore.getState().removeCandidate('missing-id', 'c1');

      expect(useQueueStore.getState()).toEqual(stateBefore);
    });
  });

  describe('selectCandidate', () => {
    it('does nothing when the item is no longer in the queue', () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track')]);
      const stateBefore = useQueueStore.getState();

      useQueueStore.getState().selectCandidate('missing-id', 'c1');

      expect(useQueueStore.getState()).toEqual(stateBefore);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      useQueueStore
        .getState()
        .addToQueue([
          createMockTrack('Track 1'),
          createMockTrack('Track 2'),
          createMockTrack('Track 3'),
        ]);
    });

    it('goToNext increments currentIndex', () => {
      useQueueStore.getState().goToNext('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(1);
    });

    it('goToNext stops at end of queue', () => {
      useQueueStore.setState({ currentIndex: 2 });
      useQueueStore.getState().goToNext('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(2);
    });

    it('goToPrevious decrements currentIndex', () => {
      useQueueStore.setState({ currentIndex: 2 });
      useQueueStore.getState().goToPrevious('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(1);
    });

    it('goToPrevious stops at start of queue', () => {
      useQueueStore.getState().goToPrevious('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(0);
    });

    it('goToIndex sets currentIndex to valid position', () => {
      useQueueStore.getState().goToIndex(2);
      expect(useQueueStore.getState().currentIndex).toBe(2);
    });

    it('goToIndex ignores out-of-bounds values', () => {
      useQueueStore.getState().goToIndex(10);
      expect(useQueueStore.getState().currentIndex).toBe(0);
    });

    it('goToId finds and navigates to item by ID', () => {
      const items = useQueueStore.getState().items;
      useQueueStore.getState().goToId(items[2].id);
      expect(useQueueStore.getState().currentIndex).toBe(2);
    });

    it('goToIndex to the current index does not stop playback', () => {
      useSoundStore.setState({ status: 'playing' });
      useQueueStore.getState().goToIndex(0);
      expect(useSoundStore.getState().status).toBe('playing');
    });

    it('goToId with the current item id does not stop playback', () => {
      useSoundStore.setState({ status: 'playing' });
      const items = useQueueStore.getState().items;
      useQueueStore.getState().goToId(items[0].id);
      expect(useSoundStore.getState().status).toBe('playing');
    });

    it('getCurrentItem returns the current queue item', () => {
      useQueueStore.setState({ currentIndex: 1 });
      const current = useQueueStore.getState().getCurrentItem();
      expect(current?.track.title).toBe('Track 2');
    });

    it('goToNext wraps to start when repeat mode is all', () => {
      useQueueStore.setState({ currentIndex: 2 });
      useSettingsStore.setState({ values: { 'core.playback.repeat': 'all' } });
      useQueueStore.getState().goToNext('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(0);
    });

    it('goToPrevious wraps to end when repeat mode is all', () => {
      useSettingsStore.setState({ values: { 'core.playback.repeat': 'all' } });
      useQueueStore.getState().goToPrevious('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(2);
    });

    it('goToNext picks a different random index when shuffle is enabled', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      useSettingsStore.setState({ values: { 'core.playback.shuffle': true } });
      useQueueStore.getState().goToNext('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(2);
      randomSpy.mockRestore();
    });

    it('goToNext retries random selection until index changes', () => {
      const randomSpy = vi
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.8);
      useSettingsStore.setState({ values: { 'core.playback.shuffle': true } });
      useQueueStore.getState().goToNext('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(2);
      expect(randomSpy).toHaveBeenCalledTimes(2);
      randomSpy.mockRestore();
    });

    it('goToPrevious picks a different random index when shuffle is enabled', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4);
      useSettingsStore.setState({ values: { 'core.playback.shuffle': true } });
      useQueueStore.setState({ currentIndex: 2 });
      useQueueStore.getState().goToPrevious('automatic');
      expect(useQueueStore.getState().currentIndex).toBe(1);
      randomSpy.mockRestore();
    });
  });

  describe('skip gate', () => {
    const tracks = [
      createMockTrack('Track 1'),
      createMockTrack('Track 2'),
      createMockTrack('Track 3'),
    ];
    const currentTitle = () =>
      useQueueStore.getState().getCurrentItem()?.track.title;
    const advanceSeconds = (seconds: number) =>
      vi.setSystemTime(Date.now() + seconds * 1000);

    beforeEach(() => {
      useQueueStore.getState().addToQueue(tracks);
      useSoundStore.setState({ seek: 20, duration: 200 });
    });

    it('skips freely during the first ten seconds of a playing track', () => {
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 9.9 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 2');
    });

    it('keeps protecting a track rewound to its start after ten seconds of play', () => {
      useSoundStore.getState().play();
      advanceSeconds(10);
      useSoundStore.setState({ seek: 0 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 1');
    });

    it('starts protecting the track once it has played ten seconds', () => {
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 10 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 1');
    });

    it('never blocks a track that has not started playing', () => {
      useQueueStore.getState().goToNext();
      expect(currentTitle()).toBe('Track 2');
    });

    it('refuses the first skip of a playing track without starting a countdown', () => {
      useSoundStore.getState().play();

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 1');
      expect(useSkipFeedbackStore.getState().feedback).toEqual({
        kind: 'skipRefused',
      });
      expect(useSkipCountdownStore.getState().skip).toBeNull();
    });

    it('refuses the second skip and starts a five-second countdown', () => {
      useSoundStore.getState().play();
      useQueueStore.getState().goToNext();
      advanceSeconds(10);

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 1');
      expect(useSkipCountdownStore.getState().skip?.deadlineMs).toBe(
        Date.now() + 5000,
      );
    });

    it('keeps refusing while the countdown runs and lets the next attempt through once it ends', () => {
      useSoundStore.getState().play();
      useQueueStore.getState().goToNext();
      useQueueStore.getState().goToNext();

      advanceSeconds(4.9);
      useQueueStore.getState().goToNext();
      expect(currentTitle()).toBe('Track 1');

      advanceSeconds(0.1);
      expect(currentTitle()).toBe('Track 1');
      useQueueStore.getState().goToNext();
      expect(currentTitle()).toBe('Track 2');
      expect(useSkipCountdownStore.getState().skip).toBeNull();
    });

    it('protects the new track again once it starts playing', () => {
      useSoundStore.getState().play();
      useQueueStore.getState().goToNext();
      useQueueStore.getState().goToNext();
      advanceSeconds(5);
      useQueueStore.getState().goToNext();
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 20 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 2');
    });

    it('applies the same countdown to previous, direct selection, and Play now', () => {
      useQueueStore.setState({ currentIndex: 1 });
      useSoundStore.getState().play();

      useQueueStore.getState().goToPrevious();
      useQueueStore.getState().goToIndex(2);
      useQueueStore.getState().goToId(useQueueStore.getState().items[0].id);
      playbackManager.playTracks([createMockTrack('New Track')]);

      expect(currentTitle()).toBe('Track 2');
      expect(useQueueStore.getState().items).toHaveLength(3);

      advanceSeconds(5);
      playbackManager.playTracks([createMockTrack('New Track')]);
      expect(currentTitle()).toBe('New Track');
    });

    it('refuses removing the playing track or clearing the queue during the countdown', () => {
      useSoundStore.getState().play();
      const currentId = useQueueStore.getState().items[0].id;

      useQueueStore.getState().removeByIds([currentId]);
      useQueueStore.getState().removeByIndices([0]);
      useQueueStore.getState().clearQueue();
      expect(useQueueStore.getState().items).toHaveLength(3);

      useQueueStore.getState().removeByIndices([2]);
      expect(useQueueStore.getState().items).toHaveLength(2);
    });

    it('lets anything through five seconds after pausing, even after resuming', () => {
      useSoundStore.getState().play();
      useSoundStore.getState().pause();
      advanceSeconds(5);
      useSoundStore.getState().play();

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 2');
    });

    it('only waits out what is left of the five seconds since a recent pause', () => {
      useSoundStore.getState().play();
      useSoundStore.getState().pause();
      advanceSeconds(3);

      useQueueStore.getState().goToNext();
      expect(useSkipCountdownStore.getState().skip).toBeNull();
      useQueueStore.getState().goToNext();
      expect(currentTitle()).toBe('Track 1');
      expect(useSkipCountdownStore.getState().skip?.deadlineMs).toBe(
        Date.now() + 2000,
      );

      advanceSeconds(2);
      useQueueStore.getState().goToNext();
      expect(currentTitle()).toBe('Track 2');
    });

    it('does not let stopping a song bypass the wait', () => {
      useSoundStore.getState().play();
      advanceSeconds(10);
      useSoundStore.getState().stop();

      playbackManager.playTracks([createMockTrack('New Track')]);
      expect(useQueueStore.getState().items).toHaveLength(3);
    });

    it('skips freely once more than 70% of the song has really been played', () => {
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 141, duration: 200 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 2');
    });

    it('skips freely after seven minutes of a song longer than ten minutes', () => {
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 421, duration: 660 });

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 2');
    });

    it('does not count fast-forwarded time towards the 70%', () => {
      useSoundStore.getState().play();
      useSoundStore.setState({ seek: 10, duration: 200 });
      useSoundStore.getState().seekTo(150);
      useSoundStore.getState().seekTo(150);
      advanceSeconds(10);
      useSoundStore.getState().seekTo(150);
      expect(useSoundStore.getState().seek).toBe(150);

      useQueueStore.getState().goToNext();

      expect(currentTitle()).toBe('Track 1');
    });

    it('does not gate automatic advances when a track finishes', () => {
      useSoundStore.getState().play();

      playbackManager.finishTrack();

      expect(currentTitle()).toBe('Track 2');
    });
  });

  describe('persistence', () => {
    it('initializeQueueStore restores state from storage', async () => {
      const tracks = [createMockTrack('Track 1'), createMockTrack('Track 2')];
      useQueueStore.getState().addToQueue(tracks);
      useQueueStore.getState().goToIndex(1);

      await new Promise((resolve) => setTimeout(resolve, 10));

      useQueueStore.setState({
        items: [],
        currentIndex: 0,
        isReady: false,
        isLoading: false,
      });

      await initializeQueueStore();

      const state = useQueueStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.currentIndex).toBe(1);
      expect(state.isReady).toBe(true);
    });

    it('sanitizes out-of-bounds currentIndex on load', async () => {
      useQueueStore.getState().addToQueue([createMockTrack('Track 1')]);
      useQueueStore.setState({ currentIndex: 5 });

      useQueueStore.setState({
        items: [],
        currentIndex: 0,
        isReady: false,
        isLoading: false,
      });

      await initializeQueueStore();

      expect(useQueueStore.getState().currentIndex).toBe(0);
    });
  });
});
