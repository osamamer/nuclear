import { create } from 'zustand';

export type PlaylistDownloadTask = {
  key: string;
  title: string;
  progress?: number;
};

type PlaylistDownloadProgressState = {
  activeDownloads: PlaylistDownloadTask[];
  queuedDownloads: PlaylistDownloadTask[];
  completedCount: number;
  failedCount: number;
  isScanning: boolean;
  setQueue: (
    activeDownloads: PlaylistDownloadTask[],
    queuedDownloads: PlaylistDownloadTask[],
  ) => void;
  setIsScanning: (isScanning: boolean) => void;
  recordResult: (succeeded: boolean) => void;
};

export const usePlaylistDownloadProgressStore =
  create<PlaylistDownloadProgressState>((set) => ({
    activeDownloads: [],
    queuedDownloads: [],
    completedCount: 0,
    failedCount: 0,
    isScanning: false,
    setQueue: (activeDownloads, queuedDownloads) =>
      set((state) => {
        const startsNewBatch =
          activeDownloads.length + queuedDownloads.length > 0 &&
          state.activeDownloads.length + state.queuedDownloads.length === 0;

        return {
          activeDownloads,
          queuedDownloads,
          completedCount: startsNewBatch ? 0 : state.completedCount,
          failedCount: startsNewBatch ? 0 : state.failedCount,
        };
      }),
    setIsScanning: (isScanning) => set({ isScanning }),
    recordResult: (succeeded) =>
      set((state) => ({
        completedCount: state.completedCount + Number(succeeded),
        failedCount: state.failedCount + Number(!succeeded),
      })),
  }));
