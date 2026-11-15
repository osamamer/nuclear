import { LazyStore } from '@tauri-apps/plugin-store';
import { produce } from 'immer';
import partition from 'lodash-es/partition';
import takeWhile from 'lodash-es/takeWhile';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

import type {
  Queue,
  QueueItem,
  StreamCandidate,
  Track,
} from '@nuclearplayer/model';
import { stripResolutionState } from '@nuclearplayer/model';

import { eventBus } from '../services/eventBus';
import { Logger } from '../services/logger';
import {
  isTrackChangeRefused,
  rewindGate,
  skipAttemptGate,
} from '../services/skipGate';
import { errorMessage } from '../utils/errorMessage';
import { secondsToMs } from '../utils/time';
import { matchesBlacklistRule, useBlacklistStore } from './blacklistStore';
import { getSetting } from './settingsStore';
import { useSkipFeedbackStore } from './skipFeedbackStore';
import { useSoundStore } from './soundStore';

const QUEUE_FILE = 'queue.json';
const store = new LazyStore(QUEUE_FILE);

type QueueStore = Queue & {
  isLoading: boolean;
  isReady: boolean;
  loadFromDisk: () => Promise<void>;
  replaceQueue: (
    tracks: Track[],
    playlistId?: string,
    startIndex?: number,
  ) => boolean;
  addToQueue: (tracks: Track[], playlistId?: string) => void;
  addNext: (tracks: Track[], playlistId?: string) => void;
  addAt: (tracks: Track[], index: number, playlistId?: string) => void;
  removeByIds: (ids: string[]) => void;
  removeBlacklistedItems: () => void;
  removeByIndices: (indices: number[]) => void;
  clearQueue: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  moveBefore: (itemId: string, beforeItemId: string | null) => void;
  updateItemState: (id: string, updates: Partial<QueueItem>) => void;
  updateCandidate: (itemId: string, candidate: StreamCandidate) => void;
  removeCandidate: (itemId: string, candidateId: string) => void;
  selectCandidate: (itemId: string, candidateId: string) => void;
  goToNext: (reason?: 'manual' | 'automatic') => void;
  goToPrevious: (reason?: 'manual' | 'automatic') => void;
  goToIndex: (index: number) => void;
  goToId: (id: string) => void;
  getCurrentItem: () => QueueItem | undefined;
  getItemById: (id: string) => QueueItem | undefined;
};

const createQueueItem = (track: Track, playlistId?: string): QueueItem => ({
  id: uuidv4(),
  track: stripResolutionState(track),
  ...(playlistId ? { playlistId } : {}),
  status: 'idle',
  addedAtIso: new Date().toISOString(),
});

const getDirectionalIndex = (
  state: Pick<QueueStore, 'items' | 'currentIndex'>,
  direction: 'forward' | 'backward',
): number => {
  const { items, currentIndex } = state;
  const shuffleEnabled =
    (getSetting('core.playback.shuffle') as boolean) ?? false;
  const repeatMode = (getSetting('core.playback.repeat') as string) ?? 'off';

  if (items.length === 0) {
    return currentIndex;
  }

  if (shuffleEnabled) {
    return getShuffledIndex(items.length, currentIndex);
  }

  if (direction === 'forward') {
    if (currentIndex < items.length - 1) {
      return currentIndex + 1;
    }
    return repeatMode === 'all' ? 0 : currentIndex;
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  return repeatMode === 'all' ? items.length - 1 : currentIndex;
};

const getShuffledIndex = (length: number, currentIndex: number): number => {
  if (length <= 1) {
    return currentIndex;
  }

  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }

  return nextIndex;
};

const emitSkip = (): void => {
  eventBus.emit('playbackSkipped', {
    positionMs: secondsToMs(useSoundStore.getState().seek),
  });
};

const isTrackBlacklisted = (track: Track, now = new Date()): boolean =>
  useBlacklistStore
    .getState()
    .rules.some((rule) => matchesBlacklistRule(rule, track, now));

const getPlayableTrackEntries = (
  tracks: Track[],
): Array<{ track: Track; index: number }> => {
  const now = new Date();
  const playableEntries = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => !isTrackBlacklisted(track, now));
  if (playableEntries.length < tracks.length) {
    useSkipFeedbackStore.getState().reportBlacklistedTracks();
  }
  return playableEntries;
};

let blacklistScheduleTimeout: ReturnType<typeof setTimeout> | undefined;

const isLeavingCurrentTrackRefused = (
  state: Pick<QueueStore, 'items' | 'currentIndex'>,
): boolean => {
  const currentItem = state.items[state.currentIndex];
  const { seek, duration } = useSoundStore.getState();
  return isTrackChangeRefused(
    currentItem?.id,
    secondsToMs(seek),
    secondsToMs(duration),
  );
};

const saveToDisk = async (): Promise<void> => {
  try {
    const state = useQueueStore.getState();
    await store.set('queue.items', state.items);
    await store.set('queue.currentIndex', state.currentIndex);
    await store.save();
  } catch (error) {
    Logger.queue.error(`Failed to save queue: ${errorMessage(error)}`);
  }
};

const withPersistence = <T extends unknown[], R>(
  fn: (...args: T) => R,
): ((...args: T) => R) => {
  return (...args: T) => {
    const result = fn(...args);
    void saveToDisk();
    return result;
  };
};

const moveToIndex = (index: number): void => {
  emitSkip();
  useSoundStore.getState().stop();
  useQueueStore.setState({ currentIndex: index });
};

const removeItemsWithIds = (ids: string[]): void => {
  const state = useQueueStore.getState();
  const idsSet = new Set(ids);
  const currentItem = state.items[state.currentIndex];
  const removedBeforeCurrent = state.items
    .slice(0, state.currentIndex)
    .filter((item) => idsSet.has(item.id)).length;
  const items = state.items.filter((item) => !idsSet.has(item.id));
  const currentIndex = Math.min(
    Math.max(0, state.currentIndex - removedBeforeCurrent),
    Math.max(0, items.length - 1),
  );

  useQueueStore.setState({ items, currentIndex });

  if ((currentItem && idsSet.has(currentItem.id)) || items.length === 0) {
    useSoundStore.getState().stop();
  }
};

const scheduleBlacklistEnforcement = (): void => {
  if (blacklistScheduleTimeout) {
    return;
  }

  const millisecondsUntilNextMinute = 60000 - (Date.now() % 60000) + 25;
  blacklistScheduleTimeout = setTimeout(() => {
    blacklistScheduleTimeout = undefined;
    useQueueStore.getState().removeBlacklistedItems();
    scheduleBlacklistEnforcement();
  }, millisecondsUntilNextMinute);
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  items: [],
  currentIndex: 0,
  isReady: false,
  isLoading: false,

  loadFromDisk: async () => {
    set({ isLoading: true });
    const loadedItems = (await store.get<QueueItem[]>('queue.items')) ?? [];
    const currentIndex = (await store.get<number>('queue.currentIndex')) ?? 0;
    const now = new Date();
    const playableItems = loadedItems
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => !isTrackBlacklisted(item.track, now));
    const resetItems = playableItems.map(({ item }) => ({
      ...item,
      status: 'idle' as const,
      error: undefined,
    }));
    const requestedIndex = Math.min(
      Math.max(Math.trunc(currentIndex), 0),
      Math.max(loadedItems.length - 1, 0),
    );
    const firstPlayableAtOrAfter = playableItems.findIndex(
      ({ originalIndex }) => originalIndex >= requestedIndex,
    );
    const sanitizedIndex =
      resetItems.length === 0
        ? 0
        : firstPlayableAtOrAfter === -1
          ? resetItems.length - 1
          : firstPlayableAtOrAfter;

    set({
      items: resetItems,
      currentIndex: sanitizedIndex,
      isReady: true,
      isLoading: false,
    });

    if (playableItems.length < loadedItems.length) {
      useSkipFeedbackStore.getState().reportBlacklistedTracks();
    }

    Logger.queue.info(`Loaded ${resetItems.length} items from disk`);
  },

  addToQueue: withPersistence((tracks: Track[], playlistId?: string) => {
    const playableTracks = getPlayableTrackEntries(tracks).map(
      ({ track }) => track,
    );
    set(
      produce((state: QueueStore) => {
        const newItems = playableTracks.map((track) =>
          createQueueItem(track, playlistId),
        );
        state.items.push(...newItems);
      }),
    );
    Logger.queue.debug(`Added ${playableTracks.length} tracks to queue`);
  }),

  replaceQueue: withPersistence(
    (tracks: Track[], playlistId?: string, startIndex = 0) => {
      const playableEntries = getPlayableTrackEntries(tracks);
      if (tracks.length > 0 && playableEntries.length === 0) {
        return false;
      }

      if (get().items.length > 0 && isLeavingCurrentTrackRefused(get())) {
        return false;
      }
      const requestedIndex = Math.min(
        Math.max(Math.trunc(startIndex), 0),
        Math.max(tracks.length - 1, 0),
      );
      const items = playableEntries.map(({ track }) =>
        createQueueItem(track, playlistId),
      );
      const firstPlayableAtOrAfter = playableEntries.findIndex(
        ({ index }) => index >= requestedIndex,
      );
      const currentIndex =
        items.length === 0
          ? 0
          : firstPlayableAtOrAfter === -1
            ? items.length - 1
            : firstPlayableAtOrAfter;
      set({ items, currentIndex });
      useSoundStore.getState().stop();
      Logger.queue.info(`Replaced queue with ${items.length} items`);
      return true;
    },
  ),

  addNext: (tracks: Track[], playlistId?: string) => {
    const { currentIndex } = get();
    get().addAt(tracks, currentIndex + 1, playlistId);
  },

  addAt: withPersistence(
    (tracks: Track[], index: number, playlistId?: string) => {
      const playableTracks = getPlayableTrackEntries(tracks).map(
        ({ track }) => track,
      );
      set(
        produce((state: QueueStore) => {
          const newItems = playableTracks.map((track) =>
            createQueueItem(track, playlistId),
          );
          state.items.splice(index, 0, ...newItems);
          if (index <= state.currentIndex) {
            state.currentIndex += newItems.length;
          }
        }),
      );
    },
  ),

  removeByIds: withPersistence((ids: string[]) => {
    const currentItem = get().getCurrentItem();
    if (
      currentItem &&
      ids.includes(currentItem.id) &&
      isLeavingCurrentTrackRefused(get())
    ) {
      return;
    }
    removeItemsWithIds(ids);
  }),

  removeBlacklistedItems: () => {
    const now = new Date();
    const ids = get()
      .items.filter((item) => isTrackBlacklisted(item.track, now))
      .map((item) => item.id);
    if (ids.length > 0) {
      removeItemsWithIds(ids);
      void saveToDisk();
    }
  },

  removeByIndices: withPersistence((indices: number[]) => {
    const { items, currentIndex } = get();
    if (indices.includes(currentIndex) && isLeavingCurrentTrackRefused(get())) {
      return;
    }
    removeItemsWithIds(
      indices
        .map((index) => items[index]?.id)
        .filter((id): id is string => id !== undefined),
    );
  }),

  clearQueue: withPersistence(() => {
    if (get().items.length > 0 && isLeavingCurrentTrackRefused(get())) {
      return;
    }
    const itemCount = get().items.length;
    set({ items: [], currentIndex: 0 });
    useSoundStore.getState().stop();
    Logger.queue.info(`Cleared queue (${itemCount} items removed)`);
  }),

  reorder: withPersistence((fromIndex: number, toIndex: number) => {
    set(
      produce((state: QueueStore) => {
        const [movedItem] = state.items.splice(fromIndex, 1);
        state.items.splice(toIndex, 0, movedItem);

        if (state.currentIndex === fromIndex) {
          state.currentIndex = toIndex;
        } else if (
          fromIndex < state.currentIndex &&
          toIndex >= state.currentIndex
        ) {
          state.currentIndex -= 1;
        } else if (
          fromIndex > state.currentIndex &&
          toIndex <= state.currentIndex
        ) {
          state.currentIndex += 1;
        }
      }),
    );
  }),

  moveBefore: withPersistence((itemId: string, beforeItemId: string | null) => {
    const movedItem = get().getItemById(itemId);
    if (!movedItem || itemId === beforeItemId) {
      return;
    }
    const currentItemId = get().getCurrentItem()?.id;

    const otherItems = get().items.filter((item) => item.id !== itemId);
    const itemsBefore = takeWhile(
      otherItems,
      (item) => item.id !== beforeItemId,
    );
    const itemsAfter = otherItems.slice(itemsBefore.length);
    const items = [...itemsBefore, movedItem, ...itemsAfter];

    set({
      items,
      currentIndex: items.findIndex((item) => item.id === currentItemId),
    });
  }),

  updateItemState: withPersistence(
    (id: string, updates: Partial<QueueItem>) => {
      set(
        produce((state: QueueStore) => {
          const item = state.items.find((item) => item.id === id);
          if (item) {
            Object.assign(item, updates);
          }
        }),
      );
    },
  ),

  updateCandidate: (itemId: string, candidate: StreamCandidate) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    get().updateItemState(itemId, {
      track: {
        ...track,
        streamCandidates: track.streamCandidates?.map((current) => {
          if (current.id === candidate.id) {
            return candidate;
          }
          return current;
        }),
      },
    });
  },

  removeCandidate: (itemId: string, candidateId: string) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    get().updateItemState(itemId, {
      track: {
        ...track,
        streamCandidates: track.streamCandidates?.filter(
          (current) => current.id !== candidateId,
        ),
      },
    });
  },

  selectCandidate: (itemId: string, candidateId: string) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    const [selected, rest] = partition(
      track.streamCandidates ?? [],
      (candidate) => candidate.id === candidateId,
    );
    const retried = selected.map((candidate) => ({
      ...candidate,
      failed: false,
    }));
    get().updateItemState(itemId, {
      track: { ...track, streamCandidates: [...retried, ...rest] },
    });
  },

  goToNext: withPersistence((reason: 'manual' | 'automatic' = 'manual') => {
    const state = get();
    const nextIndex = getDirectionalIndex(state, 'forward');
    if (nextIndex === state.currentIndex) {
      return;
    }
    if (reason === 'manual' && isLeavingCurrentTrackRefused(state)) {
      return;
    }
    moveToIndex(nextIndex);
    Logger.queue.debug(`Moved to next track (index ${nextIndex})`);
  }),

  goToPrevious: withPersistence((reason: 'manual' | 'automatic' = 'manual') => {
    const state = get();
    const previousIndex = getDirectionalIndex(state, 'backward');
    if (previousIndex === state.currentIndex) {
      return;
    }
    if (reason === 'manual' && isLeavingCurrentTrackRefused(state)) {
      return;
    }
    moveToIndex(previousIndex);
    Logger.queue.debug(`Moved to previous track (index ${previousIndex})`);
  }),

  goToIndex: withPersistence((index: number) => {
    const state = get();
    if (
      index < 0 ||
      index >= state.items.length ||
      index === state.currentIndex ||
      isLeavingCurrentTrackRefused(state)
    ) {
      return;
    }
    moveToIndex(index);
  }),

  goToId: withPersistence((id: string) => {
    const state = get();
    const index = state.items.findIndex((item) => item.id === id);
    if (
      index === -1 ||
      index === state.currentIndex ||
      isLeavingCurrentTrackRefused(state)
    ) {
      return;
    }
    moveToIndex(index);
  }),

  getCurrentItem: () => {
    const { items, currentIndex } = get();
    return items[currentIndex];
  },

  getItemById: (id: string) => {
    return get().items.find((item) => item.id === id);
  },
}));

useQueueStore.subscribe((state, previousState) => {
  const currentItemId = state.items[state.currentIndex]?.id ?? null;
  const previousItemId =
    previousState.items[previousState.currentIndex]?.id ?? null;
  if (currentItemId !== previousItemId) {
    skipAttemptGate.onCurrentTrackChanged(currentItemId);
    rewindGate.onCurrentTrackChanged(currentItemId);
  }
});

useSoundStore.subscribe((state) => {
  const currentItemId = useQueueStore.getState().getCurrentItem()?.id;
  if (!currentItemId) {
    return;
  }
  if (state.status === 'playing') {
    skipAttemptGate.onTrackPlaying(currentItemId);
  } else {
    skipAttemptGate.onTrackPaused(currentItemId);
  }
});

useBlacklistStore.subscribe((state, previousState) => {
  if (state.rules !== previousState.rules) {
    useQueueStore.getState().removeBlacklistedItems();
  }
});

export const initializeQueueStore = async (): Promise<void> => {
  await useQueueStore.getState().loadFromDisk();
};

export const startBlacklistScheduleEnforcement = (): void => {
  scheduleBlacklistEnforcement();
};
