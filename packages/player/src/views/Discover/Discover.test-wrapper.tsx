import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import {
  act,
  render,
  RenderResult,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  ArtistRef,
  StreamCandidate,
  TrackRef,
} from '@nuclearplayer/model';

import App from '../../App';
import { routeTree } from '../../routeTree.gen';
import { providersHost } from '../../services/providersHost';
import type { TopArtist, TopTrack } from '../../services/tauri/bindings';
import { useDiscoverStore } from '../../stores/discoverStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useQueueStore } from '../../stores/queueStore';
import { useSoundStore } from '../../stores/soundStore';
import { useStreamVerificationStore } from '../../stores/streamVerificationStore';
import { MetadataProviderBuilder } from '../../test/builders/MetadataProviderBuilder';
import { PlaylistBuilder } from '../../test/builders/PlaylistBuilder';
import {
  createMockStream,
  StreamingProviderBuilder,
} from '../../test/builders/StreamingProviderBuilder';
import type { TauriCommandMocks } from '../../test/utils/commandMocks';
import { ok } from '../../test/utils/commandMocks';
import { resetInMemoryTauriStore } from '../../test/utils/inMemoryTauriStore';
import { createMockTrack } from '../../test/utils/mockTrack';

const user = userEvent.setup();

export type RelatedGraph = Record<
  string,
  { related: string[]; topTracks: string[] }
>;

const artistRef = (name: string): ArtistRef => ({
  name,
  source: { provider: 'test-metadata-provider', id: `id-${name}` },
});

const trackRef = (artist: string, title: string): TrackRef => ({
  title,
  artists: [artistRef(artist)],
  source: {
    provider: 'test-metadata-provider',
    id: `track-${artist}-${title}`,
  },
});

const nameFromId = (id: string) => id.replace(/^id-/, '');

export const topArtist = (name: string, msPlayed = 600_000): TopArtist => ({
  name,
  artworkUrl: null,
  msPlayed,
  plays: Math.round(msPlayed / 200_000),
});

export const topTrack = (
  artist: string,
  title: string,
  plays = 5,
): TopTrack => ({
  title,
  artists: [artist],
  artworkUrl: null,
  msPlayed: plays * 200_000,
  plays,
});

const deckTitles = (testId: string) =>
  within(screen.getByTestId(testId))
    .getAllByTestId('discover-track-title')
    .map((element) => element.textContent);

export const createDiscoverWrapper = (commandMocks: TauriCommandMocks) => ({
  init() {
    commandMocks.reset();
    providersHost.clear();
    resetInMemoryTauriStore();
    usePlaylistStore.setState({
      index: [],
      playlists: new Map(),
      loaded: true,
    });
    useFavoritesStore.setState({
      tracks: [],
      albums: [],
      artists: [],
      loaded: true,
    });
    useQueueStore.setState({ items: [], currentIndex: 0 });
    useSoundStore.getState().stop();
    useSoundStore.getState().setSrc(null);
    useStreamVerificationStore.setState({ verifications: {} });
    useDiscoverStore.setState({
      mode: 'balanced',
      seeds: [],
      shuffleCount: 0,
      aiRequest: '',
      aiResult: null,
      pendingAiRequest: null,
    });
    this.mockHistory({ recentArtists: [], allTimeTracks: [] });
    this.mockAiAvailability({ claudeCli: false, codexCli: false });
  },

  mockHistory({
    recentArtists,
    allTimeTracks,
    recentTracks = [],
  }: {
    recentArtists: TopArtist[];
    allTimeTracks: TopTrack[];
    recentTracks?: TopTrack[];
  }) {
    commandMocks
      .command('historyTopArtists')
      .mockImplementation(async (range) =>
        ok(range.from === 0 ? [] : recentArtists),
      );
    commandMocks
      .command('historyTopTracks')
      .mockImplementation(async (range) =>
        ok(range.from === 0 ? allTimeTracks : recentTracks),
      );
  },

  mockAiAvailability(availability: { claudeCli: boolean; codexCli: boolean }) {
    commandMocks.command('aiDetectBackends').mockResolvedValue(availability);
  },

  mockAiAnswer(answer: object) {
    commandMocks
      .command('aiComplete')
      .mockResolvedValue(ok(JSON.stringify(answer)));
  },

  seedRelatedMetadataProvider(graph: RelatedGraph) {
    providersHost.register(
      new MetadataProviderBuilder()
        .withSearchCapabilities(['artists', 'tracks'])
        .withArtistMetadataCapabilities([
          'artistRelatedArtists',
          'artistTopTracks',
        ])
        .withSearchArtists(async ({ query }) => [artistRef(query)])
        .withSearchTracks(async () => [])
        .withFetchArtistRelatedArtists(async (artistId) =>
          (graph[nameFromId(artistId)]?.related ?? []).map(artistRef),
        )
        .withFetchArtistTopTracks(async (artistId) => {
          const name = nameFromId(artistId);
          return (graph[name]?.topTracks ?? []).map((title) =>
            trackRef(name, title),
          );
        })
        .build(),
    );
  },

  seedStreamingProvider(candidatesForQuery: Record<string, StreamCandidate[]>) {
    providersHost.register(
      new StreamingProviderBuilder()
        .withSearchForTrack(
          async (_artist, title) => candidatesForQuery[title] ?? [],
        )
        .withGetStreamUrl(async (candidateId) => createMockStream(candidateId))
        .build(),
    );
  },

  seedPlaylist(builder: PlaylistBuilder) {
    const playlist = builder.build();
    usePlaylistStore.setState({
      index: [builder.buildIndexEntry()],
      playlists: new Map([[playlist.id, playlist]]),
      loaded: true,
    });
  },

  async mount(): Promise<RenderResult> {
    const history = createMemoryHistory({ initialEntries: ['/discover'] });
    const router = createRouter({ routeTree, history });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const component = render(
      <App routerProp={router} queryClientProp={queryClient} />,
    );
    await screen.findByTestId('discover-view');
    return component;
  },

  noTasteState: {
    find() {
      return screen.findByTestId('discover-no-taste');
    },
  },

  noSourceState: {
    find() {
      return screen.findByTestId('discover-no-source');
    },
  },

  picks: {
    async find() {
      return screen.findByTestId('discover-picks');
    },
    get titles() {
      return deckTitles('discover-picks');
    },
    get notes() {
      return within(screen.getByTestId('discover-picks'))
        .getAllByTestId('discover-track-note')
        .map((element) => element.textContent);
    },
    card(title: string) {
      const card = within(screen.getByTestId('discover-picks'))
        .getAllByTestId('discover-track-card')
        .find((element) => within(element).queryByText(title));
      if (!card) {
        throw new Error(`Pick "${title}" not found`);
      }
      return card;
    },
    async rightClick(title: string) {
      await user.pointer({
        keys: '[MouseRight]',
        target: within(this.card(title)).getByTestId('discover-track-title'),
      });
    },
    async playAll() {
      await user.click(
        within(screen.getByTestId('discover-picks')).getByTestId(
          'deck-play-all',
        ),
      );
    },
  },

  artists: {
    get names() {
      return within(screen.getByTestId('discover-artists'))
        .getAllByTestId('discover-artist')
        .map((element) => element.textContent);
    },
  },

  rediscover: {
    async find() {
      return screen.findByTestId('discover-rediscover');
    },
    get titles() {
      return deckTitles('discover-rediscover');
    },
  },

  tasteDna: {
    get chips() {
      return screen.getAllByTestId('taste-dna-chip');
    },
    get chipNames() {
      return this.chips.map((chip) => chip.textContent);
    },
    async toggle(name: string) {
      const chip = this.chips.find((element) => element.textContent === name);
      await user.click(chip!);
    },
  },

  modes: {
    async select(label: string) {
      await user.click(
        within(screen.getByTestId('discover-mode')).getByText(label),
      );
    },
  },

  ai: {
    get setupHint() {
      return screen.queryByTestId('discover-ai-setup');
    },
    findSetupHint() {
      return screen.findByTestId('discover-ai-setup');
    },
    findBackendBadge() {
      return screen.findByTestId('discover-ai-backend');
    },
    async ask(text: string) {
      await user.type(screen.getByTestId('discover-ai-input'), text);
      await user.click(screen.getByTestId('discover-ai-submit'));
    },
    async findResults() {
      return screen.findByTestId('discover-ai-results');
    },
    get resultTitles() {
      return deckTitles('discover-ai-results');
    },
    get resultNotes() {
      return within(screen.getByTestId('discover-ai-results'))
        .getAllByTestId('discover-track-note')
        .map((element) => element.textContent);
    },
    findError() {
      return screen.findByTestId('discover-ai-error');
    },
  },

  contextMenu: {
    async chooseVersion() {
      await user.click(await screen.findByTestId('choose-version-action'));
    },
  },

  versionPicker: {
    find() {
      return screen.findByTestId('version-picker');
    },
    findEmpty() {
      return screen.findByTestId('version-picker-empty');
    },
    async findOptionTitles() {
      const list = await screen.findByTestId('version-picker-list');
      return within(list)
        .getAllByTestId('version-option')
        .map((option) => option.textContent);
    },
    async selectVariant(label: string) {
      await user.click(
        within(screen.getByTestId('version-variants')).getByText(label),
      );
    },
    async selectOption(title: string) {
      const list = await screen.findByTestId('version-picker-list');
      const option = within(list)
        .getAllByTestId('version-option')
        .find((element) => within(element).queryByText(title));
      await user.click(option!);
    },
    async findPreviewButton(title: string) {
      const list = await screen.findByTestId('version-picker-list');
      const row = within(list)
        .getAllByTestId('version-option')
        .find((element) => within(element).queryByText(title))!
        .closest('li')!;
      return within(row).getByTestId('version-preview-button');
    },
    async togglePreview(title: string) {
      await user.click(await this.findPreviewButton(title));
    },
    get previewAudio() {
      const [audio] = screen
        .getByTestId('version-picker')
        .getElementsByTagName('audio');
      return audio;
    },
    readyPreviewAudio() {
      const audio = this.previewAudio;
      act(() => {
        Object.defineProperty(audio, 'readyState', { value: 3 });
        audio.dispatchEvent(new Event('canplay'));
      });
    },
    async toggleRemember() {
      await user.click(screen.getByTestId('version-remember-toggle'));
    },
    async play() {
      await user.click(screen.getByTestId('version-play-button'));
    },
    get element() {
      return screen.queryByTestId('version-picker');
    },
  },

  queue: {
    startListening(title: string) {
      act(() => {
        useQueueStore.getState().replaceQueue([createMockTrack(title)]);
        useSoundStore.getState().play();
        useSoundStore.getState().updatePlayback(30, 240);
      });
    },
    get currentTrack() {
      const { items, currentIndex } = useQueueStore.getState();
      return items[currentIndex]?.track;
    },
    get titles() {
      return useQueueStore.getState().items.map((item) => item.track.title);
    },
  },

  get verifications() {
    return useStreamVerificationStore.getState().verifications;
  },
});
