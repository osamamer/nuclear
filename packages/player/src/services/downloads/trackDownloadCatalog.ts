import { LazyStore } from '@tauri-apps/plugin-store';

import type { Track } from '@nuclearplayer/model';

import { trackFileExists } from '../tauri/trackDownloads';

const DOWNLOADS_FILE = 'downloads.json';
const store = new LazyStore(DOWNLOADS_FILE);

type DownloadRecord = {
  fileName: string;
  downloadedAtIso: string;
};

type DownloadRecords = Record<string, DownloadRecord>;

let records: DownloadRecords = {};
let recordsLoad: Promise<void> | undefined;
let persistRecords = Promise.resolve();

const persistCatalog = (): Promise<void> => {
  persistRecords = persistRecords
    .catch(() => undefined)
    .then(async () => {
      await store.set('tracks', records);
      await store.save();
    });
  return persistRecords;
};

export const trackDownloadKey = (track: Track): string =>
  `${track.source.provider}/${track.source.id}`;

const loadRecords = (): Promise<void> => {
  if (!recordsLoad) {
    recordsLoad = store
      .get<DownloadRecords>('tracks')
      .then((loaded) => {
        records = loaded ?? {};
      })
      .catch((error) => {
        recordsLoad = undefined;
        throw error;
      });
  }
  return recordsLoad;
};

export const findDownloadedTrack = async (
  track: Track,
): Promise<string | undefined> => {
  await loadRecords();
  const key = trackDownloadKey(track);
  const record = records[key];
  if (!record) {
    return undefined;
  }

  if (await trackFileExists(record.fileName)) {
    return record.fileName;
  }

  const nextRecords = { ...records };
  delete nextRecords[key];
  records = nextRecords;
  await persistCatalog();
  return undefined;
};

export const saveDownloadedTrack = async (
  track: Track,
  fileName: string,
): Promise<void> => {
  await loadRecords();
  records = {
    ...records,
    [trackDownloadKey(track)]: {
      fileName,
      downloadedAtIso: new Date().toISOString(),
    },
  };
  await persistCatalog();
};

export const initializeTrackDownloadCatalog = loadRecords;
