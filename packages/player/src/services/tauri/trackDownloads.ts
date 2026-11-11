import { invoke } from '@tauri-apps/api/core';

export const downloadTrack = (
  url: string,
  trackKey: string,
  container: string,
): Promise<string> =>
  invoke<string>('download_track', { url, trackKey, container });

export const trackFileExists = (fileName: string): Promise<boolean> =>
  invoke<boolean>('track_file_exists', { fileName });
