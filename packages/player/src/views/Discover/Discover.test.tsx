import { screen, waitFor } from '@testing-library/react';

import { PlaylistBuilder } from '../../test/builders/PlaylistBuilder';
import {
  createDiscoverWrapper,
  RelatedGraph,
  topArtist,
  topTrack,
} from './Discover.test-wrapper';

const commandMocks = await vi.hoisted(async () => {
  const { TauriCommandMocks } = await import('../../test/utils/commandMocks');
  return new TauriCommandMocks();
});

vi.mock('../../services/tauri/bindings', () => commandMocks.moduleFactory());

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(9100),
}));

const Wrapper = createDiscoverWrapper(commandMocks);

const GRAPH: RelatedGraph = {
  Radiohead: { related: ['Portishead', 'Thom Yorke'], topTracks: [] },
  Portishead: { related: [], topTracks: ['Roads', 'Glory Box'] },
  'Thom Yorke': { related: [], topTracks: ['Black Swan'] },
};

const seedRadioheadFan = () => {
  Wrapper.mockHistory({
    recentArtists: [topArtist('Radiohead')],
    allTimeTracks: [],
  });
  Wrapper.seedRelatedMetadataProvider(GRAPH);
};

describe('Discover view', () => {
  beforeEach(() => {
    Wrapper.init();
  });

  it('asks the user to listen first when there is no taste to learn from', async () => {
    Wrapper.seedRelatedMetadataProvider(GRAPH);
    await Wrapper.mount();

    expect(await Wrapper.noTasteState.find()).toBeInTheDocument();
  });

  it('explains that a discovery source is needed when no provider can recommend', async () => {
    Wrapper.mockHistory({
      recentArtists: [topArtist('Radiohead')],
      allTimeTracks: [],
    });
    await Wrapper.mount();

    expect(await Wrapper.noSourceState.find()).toBeInTheDocument();
  });

  it('recommends songs from artists related to what the user listens to', async () => {
    seedRadioheadFan();
    await Wrapper.mount();

    await Wrapper.picks.find();
    expect(Wrapper.picks.titles.sort()).toEqual(
      ['Black Swan', 'Glory Box', 'Roads'].sort(),
    );
    expect(Wrapper.picks.notes).toContain('Because you like Radiohead');
  });

  it('suggests related artists to explore', async () => {
    seedRadioheadFan();
    await Wrapper.mount();

    await Wrapper.picks.find();
    expect(Wrapper.artists.names.join(' ')).toContain('Portishead');
    expect(Wrapper.artists.names.join(' ')).toContain('Thom Yorke');
  });

  it('skips songs the user has already played', async () => {
    Wrapper.mockHistory({
      recentArtists: [topArtist('Radiohead')],
      allTimeTracks: [topTrack('Portishead', 'Roads (Remastered)', 1)],
    });
    Wrapper.seedRelatedMetadataProvider(GRAPH);
    await Wrapper.mount();

    await Wrapper.picks.find();
    expect(Wrapper.picks.titles).not.toContain('Roads');
    expect(Wrapper.picks.titles).toContain('Glory Box');
  });

  it('treats artists from playlists as part of the taste profile', async () => {
    Wrapper.mockHistory({ recentArtists: [], allTimeTracks: [] });
    Wrapper.seedRelatedMetadataProvider(GRAPH);
    Wrapper.seedPlaylist(
      new PlaylistBuilder().withItems([
        {
          id: 'item-1',
          addedAtIso: '2026-01-01T00:00:00.000Z',
          track: {
            title: 'Reckoner',
            artists: [{ name: 'Radiohead', roles: [] }],
            source: { provider: 'test', id: 'reckoner' },
          },
        },
      ]),
    );
    await Wrapper.mount();

    await Wrapper.picks.find();
    expect(Wrapper.tasteDna.chipNames).toEqual(['Radiohead']);
    expect(Wrapper.picks.titles).toContain('Black Swan');
  });

  it('shows the artists that shape the taste profile as steerable chips', async () => {
    Wrapper.mockHistory({
      recentArtists: [topArtist('Radiohead', 900_000), topArtist('Björk')],
      allTimeTracks: [],
    });
    Wrapper.seedRelatedMetadataProvider({
      ...GRAPH,
      Björk: { related: ['Massive Attack'], topTracks: [] },
      'Massive Attack': { related: [], topTracks: ['Teardrop'] },
    });
    await Wrapper.mount();
    await Wrapper.picks.find();

    expect(Wrapper.tasteDna.chipNames).toEqual(['Radiohead', 'Björk']);

    await Wrapper.tasteDna.toggle('Björk');

    await waitFor(() => {
      expect(Wrapper.picks.titles).toEqual(['Teardrop']);
    });
  });

  it('plays all recommended songs', async () => {
    seedRadioheadFan();
    await Wrapper.mount();
    await Wrapper.picks.find();

    await Wrapper.picks.playAll();

    expect(Wrapper.queue.titles.sort()).toEqual(
      ['Black Swan', 'Glory Box', 'Roads'].sort(),
    );
  });

  it('brings back songs the user loved but has not played lately', async () => {
    Wrapper.mockHistory({
      recentArtists: [topArtist('Radiohead')],
      allTimeTracks: [
        topTrack('Radiohead', 'Lucky', 12),
        topTrack('Radiohead', 'Creep', 1),
      ],
      recentTracks: [],
    });
    Wrapper.seedRelatedMetadataProvider(GRAPH);
    await Wrapper.mount();

    await Wrapper.rediscover.find();
    expect(Wrapper.rediscover.titles).toEqual(['Lucky']);
  });

  describe('AI curator', () => {
    it('explains how to set up an assistant when none is available', async () => {
      seedRadioheadFan();
      await Wrapper.mount();

      expect(await Wrapper.ai.findSetupHint()).toBeInTheDocument();
    });

    it('curates songs from a natural-language request', async () => {
      seedRadioheadFan();
      Wrapper.mockAiAvailability({ claudeCli: true, codexCli: false });
      Wrapper.mockAiAnswer({
        headline: 'Moody trip-hop for the night',
        picks: [
          {
            artist: 'Massive Attack',
            title: 'Teardrop',
            reason: 'Haunting vocals you will love',
          },
          {
            artist: 'Tricky',
            title: 'Overcome',
            reason: 'Darker side of Bristol',
          },
        ],
      });
      await Wrapper.mount();
      expect(await Wrapper.ai.findBackendBadge()).toHaveTextContent(
        'Claude Code',
      );

      await Wrapper.ai.ask('dark trip-hop for a rainy night');

      await Wrapper.ai.findResults();
      expect(screen.getByText('Moody trip-hop for the night')).toBeVisible();
      expect(Wrapper.ai.resultTitles).toEqual(['Teardrop', 'Overcome']);
      expect(Wrapper.ai.resultNotes).toEqual([
        'Haunting vocals you will love',
        'Darker side of Bristol',
      ]);
      expect(commandMocks.command('aiComplete')).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: 'claudeCli',
          prompt: expect.stringContaining('dark trip-hop for a rainy night'),
        }),
      );
      expect(commandMocks.command('aiComplete')).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Radiohead'),
        }),
      );
    });

    it('shows an error when the assistant fails', async () => {
      seedRadioheadFan();
      Wrapper.mockAiAvailability({ claudeCli: false, codexCli: true });
      commandMocks
        .command('aiComplete')
        .mockResolvedValue({ status: 'error', error: 'codex crashed' });
      await Wrapper.mount();
      await Wrapper.ai.findBackendBadge();

      await Wrapper.ai.ask('anything');

      expect(await Wrapper.ai.findError()).toHaveTextContent('codex crashed');
    });
  });

  it('keeps the version picker open when no streaming provider is active', async () => {
    seedRadioheadFan();
    await Wrapper.mount();
    await Wrapper.picks.find();

    await Wrapper.picks.rightClick('Roads');
    await Wrapper.contextMenu.chooseVersion();

    expect(await Wrapper.versionPicker.findEmpty()).toBeInTheDocument();
    expect(await Wrapper.versionPicker.find()).toBeInTheDocument();
  });

  describe('choosing a version', () => {
    const LIVE = {
      id: 'roads-live',
      title: 'Portishead - Roads (Live at Roseland)',
      failed: false,
      source: { provider: 'test-streaming-provider', id: 'roads-live' },
    };
    const STUDIO = {
      id: 'roads-studio',
      title: 'Portishead - Roads',
      failed: false,
      source: { provider: 'test-streaming-provider', id: 'roads-studio' },
    };

    beforeEach(() => {
      seedRadioheadFan();
      Wrapper.seedStreamingProvider({
        Roads: [STUDIO, LIVE],
        'Roads live': [LIVE],
      });
    });

    it('opens from the right-click menu and lists the available versions', async () => {
      await Wrapper.mount();
      await Wrapper.picks.find();

      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.find();
      expect(await Wrapper.versionPicker.findOptionTitles()).toEqual([
        'Portishead - Roads',
        'Portishead - Roads (Live at Roseland)',
      ]);
    });

    it('filters versions by kind', async () => {
      await Wrapper.mount();
      await Wrapper.picks.find();
      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.selectVariant('Live');

      await waitFor(async () => {
        expect(await Wrapper.versionPicker.findOptionTitles()).toEqual([
          'Portishead - Roads (Live at Roseland)',
        ]);
      });
    });

    it('plays the chosen version and remembers it for next time', async () => {
      await Wrapper.mount();
      await Wrapper.picks.find();
      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.selectOption(
        'Portishead - Roads (Live at Roseland)',
      );
      await Wrapper.versionPicker.play();

      expect(Wrapper.versionPicker.element).not.toBeInTheDocument();
      expect(Wrapper.queue.currentTrack?.title).toBe('Roads');
      expect(Wrapper.queue.currentTrack?.streamCandidates?.[0]?.id).toBe(
        'roads-live',
      );
      expect(Object.values(Wrapper.verifications)).toEqual(['roads-live']);
    });

    it('previews a version inside the popup and stops it on a second click', async () => {
      await Wrapper.mount();
      await Wrapper.picks.find();
      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.togglePreview(
        'Portishead - Roads (Live at Roseland)',
      );

      await waitFor(async () => {
        expect(
          await Wrapper.versionPicker.findPreviewButton(
            'Portishead - Roads (Live at Roseland)',
          ),
        ).toHaveAccessibleName('Stop preview');
      });

      await Wrapper.versionPicker.togglePreview(
        'Portishead - Roads (Live at Roseland)',
      );

      expect(
        await Wrapper.versionPicker.findPreviewButton(
          'Portishead - Roads (Live at Roseland)',
        ),
      ).toHaveAccessibleName('Preview this version');
    });

    it('previews and plays a clicked version while another song is in its skip waiting period', async () => {
      Wrapper.queue.startListening('Another song');
      await Wrapper.mount();
      await Wrapper.picks.find();
      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.selectOption(
        'Portishead - Roads (Live at Roseland)',
      );
      await waitFor(() => {
        expect(Wrapper.versionPicker.previewAudio?.src).toContain('/stream/');
      });
      Wrapper.versionPicker.readyPreviewAudio();
      expect(Wrapper.versionPicker.previewAudio.paused).toBe(false);
      expect(Wrapper.queue.currentTrack?.title).toBe('Another song');

      await Wrapper.versionPicker.play();

      const chosen = Wrapper.queue.currentTrack?.streamCandidates?.[0];
      expect(chosen?.id).toBe('roads-live');
      expect(chosen?.userSelected).toBe(true);
    });

    it('does not remember the version when the user opts out', async () => {
      await Wrapper.mount();
      await Wrapper.picks.find();
      await Wrapper.picks.rightClick('Roads');
      await Wrapper.contextMenu.chooseVersion();

      await Wrapper.versionPicker.selectOption(
        'Portishead - Roads (Live at Roseland)',
      );
      await Wrapper.versionPicker.toggleRemember();
      await Wrapper.versionPicker.play();

      expect(Wrapper.queue.currentTrack?.streamCandidates?.[0]?.id).toBe(
        'roads-live',
      );
      expect(Wrapper.verifications).toEqual({});
    });
  });
});
