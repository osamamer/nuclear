import { usePlaylistDownloadProgressStore } from '../../stores/playlistDownloadProgressStore';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { PlaylistBuilder } from '../../test/builders/PlaylistBuilder';
import { playlistFileService } from '../playlistFileService';
import { providersHost } from '../providersHost';
import { hasActiveStreamingProvider } from '../streamingHost';
import { downloadTrack } from '../tauri/trackDownloads';
import { startPlaylistDownloadService } from './playlistDownloadService';
import { findDownloadedTrack } from './trackDownloadCatalog';

vi.mock('../playlistFileService', () => ({
  playlistFileService: { loadPlaylist: vi.fn() },
}));

vi.mock('./trackDownloadCatalog', () => ({
  initializeTrackDownloadCatalog: vi.fn().mockResolvedValue(undefined),
  findDownloadedTrack: vi.fn().mockResolvedValue(undefined),
  saveDownloadedTrack: vi.fn(),
  trackDownloadKey: (track: { source: { provider: string; id: string } }) =>
    `${track.source.provider}/${track.source.id}`,
}));

vi.mock('../providersHost', () => ({
  providersHost: { getActive: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../streamingHost', () => ({
  hasActiveStreamingProvider: vi.fn().mockReturnValue(false),
  streamingHost: {
    resolveStreamForCandidate: vi.fn().mockResolvedValue({
      stream: {
        protocol: 'https',
        url: 'https://example.com/audio.m4a',
        container: 'm4a',
      },
    }),
  },
}));

vi.mock('../streamResolution/candidateSource', () => ({
  candidatesForTrack: vi.fn().mockResolvedValue([{ id: 'candidate' }]),
}));

vi.mock('../tauri/trackDownloads', () => ({
  downloadTrack: vi.fn(() => new Promise<string>(() => {})),
}));

describe('playlist auto-download scan', () => {
  it('scans only selected playlists and keeps the UI queue preview bounded', async () => {
    const largePlaylist = new PlaylistBuilder()
      .withId('large')
      .withTrackCount(2200);
    const otherPlaylist = new PlaylistBuilder()
      .withId('other')
      .withTrackCount(1100);
    const playlists = new Map([
      ['large', largePlaylist.build()],
      ['other', otherPlaylist.build()],
    ]);
    vi.mocked(playlistFileService.loadPlaylist).mockImplementation(
      async (id) => playlists.get(id) ?? null,
    );
    useSettingsStore.setState({
      values: {
        'core.playback.autoDownloadPlaylists': true,
        'core.playback.autoDownloadPlaylistIds': ['large'],
      },
    });
    usePlaylistStore.setState({
      index: [largePlaylist.buildIndexEntry(), otherPlaylist.buildIndexEntry()],
      playlists: new Map(),
      loaded: true,
    });

    startPlaylistDownloadService();

    await vi.waitFor(() => {
      expect(usePlaylistDownloadProgressStore.getState().isScanning).toBe(
        false,
      );
    });
    await vi.waitFor(() => {
      expect(usePlaylistDownloadProgressStore.getState().queuedCount).toBe(
        2200,
      );
    });

    expect(playlistFileService.loadPlaylist).toHaveBeenCalledTimes(1);
    expect(findDownloadedTrack).toHaveBeenCalledTimes(2200);
    expect(usePlaylistStore.getState().playlists.size).toBe(0);
    expect(
      usePlaylistDownloadProgressStore.getState().queuedDownloads,
    ).toHaveLength(4);

    const onProviderChange = vi.mocked(providersHost.subscribe).mock
      .calls[0][0];
    onProviderChange();
    expect(playlistFileService.loadPlaylist).toHaveBeenCalledTimes(1);

    const addedPlaylist = new PlaylistBuilder()
      .withId('added')
      .withTrackCount(3)
      .build();
    usePlaylistStore.setState({
      playlists: new Map([['added', addedPlaylist]]),
    });

    expect(findDownloadedTrack).toHaveBeenCalledTimes(2200);
    expect(playlistFileService.loadPlaylist).toHaveBeenCalledTimes(1);

    vi.mocked(hasActiveStreamingProvider).mockReturnValue(true);
    onProviderChange();

    await vi.waitFor(() => {
      expect(downloadTrack).toHaveBeenCalledTimes(4);
      expect(
        usePlaylistDownloadProgressStore.getState().activeDownloads,
      ).toHaveLength(4);
    });
    expect(usePlaylistDownloadProgressStore.getState().queuedCount).toBe(2196);
  });
});
