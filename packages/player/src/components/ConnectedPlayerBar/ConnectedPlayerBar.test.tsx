import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { providersHost } from '../../services/providersHost';
import { resetSkipGates } from '../../services/skipGate';
import { useQueueStore } from '../../stores/queueStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSoundStore } from '../../stores/soundStore';
import { DiscoveryProviderBuilder } from '../../test/builders/DiscoveryProviderBuilder';
import { ConnectedPlayerBarWrapper as Wrapper } from './ConnectedPlayerBar.test-wrapper';

vi.mock('../../services/skipRefusalSound', () => ({
  playSkipRefusalSound: vi.fn(),
}));

beforeEach(() => {
  resetSkipGates();
  providersHost.clear();
  useQueueStore.setState({
    items: [],
    currentIndex: 0,
  });
  useSettingsStore.setState({
    definitions: {},
    values: {},
    loaded: true,
  });
  useSoundStore.setState({
    status: 'stopped',
    pausedAt: null,
    seek: 0,
    duration: 0,
  });
});

describe('ConnectedNowPlaying', () => {
  it('shows track title, artist, and thumbnail when a track is playing', async () => {
    const item = new Wrapper.QueueItemBuilder()
      .withTitle('Paranoid Android')
      .withArtwork('https://example.com/art.jpg')
      .withArtist('Radiohead')
      .build();
    Wrapper.seedQueueItem(item);
    await Wrapper.mount();

    expect(Wrapper.nowPlaying.title('Paranoid Android')).toBeInTheDocument();
    expect(Wrapper.nowPlaying.artist('Radiohead')).toBeInTheDocument();
    expect(Wrapper.nowPlaying.thumbnail).toBeInTheDocument();
    expect(Wrapper.nowPlaying.thumbnail).toHaveAttribute(
      'src',
      'https://example.com/art.jpg',
    );
  });

  it('shows placeholder when no track is playing', async () => {
    await Wrapper.mount();

    expect(Wrapper.nowPlaying.placeholder).toBeInTheDocument();
    expect(Wrapper.nowPlaying.thumbnail).not.toBeInTheDocument();
  });

  it('shows placeholder when track has no artwork', async () => {
    const item = new Wrapper.QueueItemBuilder().build();
    Wrapper.seedQueueItem(item);
    await Wrapper.mount();

    expect(Wrapper.nowPlaying.placeholder).toBeInTheDocument();
    expect(Wrapper.nowPlaying.thumbnail).not.toBeInTheDocument();
  });

  it('navigates to the artist page when the artist name is clicked', async () => {
    const item = new Wrapper.QueueItemBuilder()
      .withArtist('Radiohead')
      .withArtistSource('test-provider', 'artist-123')
      .build();
    Wrapper.seedQueueItem(item);
    const { router } = await Wrapper.mount();

    await Wrapper.nowPlaying.clickArtist();

    expect(router.state.location.pathname).toBe(
      '/artist/test-provider/artist-123',
    );
  });

  it('navigates to the album page when the title is clicked', async () => {
    const item = new Wrapper.QueueItemBuilder()
      .withAlbum('OK Computer', 'test-provider', 'album-456')
      .build();
    Wrapper.seedQueueItem(item);
    const { router } = await Wrapper.mount();

    await Wrapper.nowPlaying.clickTitle();

    expect(router.state.location.pathname).toBe(
      '/album/test-provider/album-456',
    );
  });

  it('navigates to search when clicking an artist without a source', async () => {
    const item = new Wrapper.QueueItemBuilder()
      .withArtist('Radiohead')
      .withoutArtistSource()
      .build();
    Wrapper.seedQueueItem(item);
    const { router } = await Wrapper.mount();

    await Wrapper.nowPlaying.clickArtist();

    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toEqual({ q: 'Radiohead' });
  });

  it('does not make the title clickable when the track has no album', async () => {
    const item = new Wrapper.QueueItemBuilder()
      .withTitle('Paranoid Android')
      .build();
    Wrapper.seedQueueItem(item);
    const { router } = await Wrapper.mount();

    expect(Wrapper.nowPlaying.title('Paranoid Android')).toBeInTheDocument();

    await Wrapper.nowPlaying.clickTitle();

    expect(router.state.location.pathname).toBe('/dashboard');
  });
});

describe('ConnectedControls', () => {
  it('refuses the first Next on a playing track and shows the skip countdown bubble on the second', async () => {
    Wrapper.seedQueueItems([
      new Wrapper.QueueItemBuilder().withId('first').withTitle('First').build(),
      new Wrapper.QueueItemBuilder()
        .withId('second')
        .withTitle('Second')
        .build(),
    ]);
    useSoundStore.setState({ seek: 30, duration: 200 });
    useSoundStore.getState().play();
    await Wrapper.mount();

    await Wrapper.controls.nextButton.click();
    expect(Wrapper.nowPlaying.title('First')).toBeInTheDocument();

    await Wrapper.controls.nextButton.click();

    expect(Wrapper.nowPlaying.title('First')).toBeInTheDocument();
    expect(await Wrapper.skipBubble.find()).toHaveAttribute(
      'data-ready',
      'false',
    );
    expect(Wrapper.skipBubble.seconds).toHaveTextContent('5');
  });

  it('refuses Previous on a playing track', async () => {
    Wrapper.seedQueueItems(
      [
        new Wrapper.QueueItemBuilder()
          .withId('first')
          .withTitle('First')
          .build(),
        new Wrapper.QueueItemBuilder()
          .withId('second')
          .withTitle('Second')
          .build(),
      ],
      1,
    );
    useSoundStore.setState({ seek: 30, duration: 200 });
    useSoundStore.getState().play();
    await Wrapper.mount();

    await Wrapper.controls.previousButton.click();

    expect(Wrapper.nowPlaying.title('Second')).toBeInTheDocument();
    expect(useQueueStore.getState().currentIndex).toBe(1);
  });

  it('clicking shuffle toggles shuffleEnabled in the settings store', async () => {
    Wrapper.seedShuffle(false);
    await Wrapper.mount();

    await Wrapper.controls.shuffleButton.click();
    expect(useSettingsStore.getState().values['core.playback.shuffle']).toBe(
      true,
    );

    await Wrapper.controls.shuffleButton.click();
    expect(useSettingsStore.getState().values['core.playback.shuffle']).toBe(
      false,
    );
  });

  it('clicking repeat cycles through modes: off -> all -> one -> off', async () => {
    Wrapper.seedRepeatMode('off');
    await Wrapper.mount();

    await Wrapper.controls.repeatButton.click();
    expect(useSettingsStore.getState().values['core.playback.repeat']).toBe(
      'all',
    );

    await Wrapper.controls.repeatButton.click();
    expect(useSettingsStore.getState().values['core.playback.repeat']).toBe(
      'one',
    );

    await Wrapper.controls.repeatButton.click();
    expect(useSettingsStore.getState().values['core.playback.repeat']).toBe(
      'off',
    );
  });

  it('clicking discovery toggles the discovery setting', async () => {
    providersHost.register(new DiscoveryProviderBuilder().build());
    await Wrapper.mount();

    await Wrapper.controls.discoveryButton.click();
    expect(useSettingsStore.getState().values['core.playback.discovery']).toBe(
      true,
    );

    await Wrapper.controls.discoveryButton.click();
    expect(useSettingsStore.getState().values['core.playback.discovery']).toBe(
      false,
    );
  });
});

describe('ConnectedPlayerBar time', () => {
  it('shows elapsed time and total length of the current track', async () => {
    Wrapper.seedQueueItem(new Wrapper.QueueItemBuilder().build());
    await Wrapper.mount();

    act(() => {
      Wrapper.setPlaybackTiming(83, 245);
    });

    expect(Wrapper.elapsedTime).toHaveTextContent('1:23');
    expect(Wrapper.totalTime).toHaveTextContent('4:05');
  });
});

describe('ConnectedVolume', () => {
  it('volume slider reflects the current volume from settings store', async () => {
    Wrapper.seedVolume(0.6);
    await Wrapper.mount();

    expect(Wrapper.volume.rangeInput).toHaveValue('60');
  });

  it('slider updates when the store volume changes after mount', async () => {
    Wrapper.seedVolume(0.5);
    await Wrapper.mount();

    expect(Wrapper.volume.rangeInput).toHaveValue('50');

    act(() => {
      useSettingsStore.setState({
        values: { 'core.playback.volume': 0.8 },
      });
    });

    expect(Wrapper.volume.rangeInput).toHaveValue('80');
  });

  it('changing the volume slider updates the settings store value', async () => {
    Wrapper.seedVolume(0.5);
    await Wrapper.mount();

    await Wrapper.volume.changeValue(75);

    const storedVolume = useSettingsStore.getState().values[
      'core.playback.volume'
    ] as number;
    expect(storedVolume).toBe(0.75);
  });
});
