import { LazyStore } from '@tauri-apps/plugin-store';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

import type { Track } from '@nuclearplayer/model';

import { Logger } from '../services/logger';

const BLACKLIST_FILE = 'blacklist.json';
const store = new LazyStore(BLACKLIST_FILE);

export type BlacklistTarget = 'track' | 'artist' | 'album' | 'keyword';

export type BlacklistSchedule =
  | { type: 'always' }
  | { type: 'time-window'; startTime: string; endTime: string };

export type BlacklistRule = {
  id: string;
  target: BlacklistTarget;
  value: string;
  schedule: BlacklistSchedule;
};

type NewBlacklistRule = Omit<BlacklistRule, 'id'>;

type BlacklistState = {
  rules: BlacklistRule[];
  loadFromDisk: () => Promise<void>;
  addRule: (rule: NewBlacklistRule) => void;
  removeRule: (id: string) => void;
};

let saveQueue = Promise.resolve();

const saveRules = (rules: BlacklistRule[]): void => {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      await store.set('blacklist.rules', rules);
      await store.save();
    })
    .catch((error: unknown) => {
      void Logger.settings.error(
        `Failed to save blacklist rules: ${String(error)}`,
      );
    });
};

export const useBlacklistStore = create<BlacklistState>((set, get) => ({
  rules: [],
  loadFromDisk: async () => {
    const rules = (await store.get<BlacklistRule[]>('blacklist.rules')) ?? [];
    set({ rules });
  },
  addRule: (rule) => {
    const rules = [...get().rules, { ...rule, id: uuidv4() }];
    set({ rules });
    saveRules(rules);
  },
  removeRule: (id) => {
    const rules = get().rules.filter((rule) => rule.id !== id);
    set({ rules });
    saveRules(rules);
  },
}));

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

const getMinutes = (value: string): number | null => {
  const [hours, minutes] = value.split(':').map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const isScheduleActive = (schedule: BlacklistSchedule, now: Date): boolean => {
  if (schedule.type === 'always') {
    return true;
  }

  const start = getMinutes(schedule.startTime);
  const end = getMinutes(schedule.endTime);
  if (start === null || end === null) {
    return false;
  }
  if (start === end) {
    return true;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
};

export const matchesBlacklistRule = (
  rule: BlacklistRule,
  track: Track,
  now = new Date(),
): boolean => {
  if (!isScheduleActive(rule.schedule, now)) {
    return false;
  }

  const value = normalize(rule.value);
  if (!value) {
    return false;
  }

  const title = normalize(track.title);
  const album = normalize(track.album?.title ?? '');
  const artists = track.artists.map((artist) => normalize(artist.name));

  switch (rule.target) {
    case 'track':
      return title === value;
    case 'artist':
      return artists.includes(value);
    case 'album':
      return album === value;
    case 'keyword':
      return [title, album, ...artists].some((field) => field.includes(value));
  }
};

export const initializeBlacklistStore = async (): Promise<void> => {
  await useBlacklistStore.getState().loadFromDisk();
};
