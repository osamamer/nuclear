import { vi } from 'vitest';

import {
  LIVE,
  STUDIO,
  VersionChoiceWrapper as Wrapper,
} from './VersionChoice.test-wrapper';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(9100),
}));

describe('Choosing which version of a song plays', () => {
  beforeEach(async () => {
    await Wrapper.reset();
  });

  it('plays the downloaded copy when no version was chosen', async () => {
    const item = Wrapper.queueItem('Downloaded');
    await Wrapper.seedDownload(item, 'studio');

    await Wrapper.play(item);

    expect(Wrapper.playingUrl).toBe(`local:${item.id}.m4a`);
  });

  it('streams the version the user picked instead of the downloaded copy', async () => {
    const item = Wrapper.queueItem('Picked', [
      { ...LIVE, userSelected: true },
      STUDIO,
    ]);
    await Wrapper.seedDownload(item, 'studio');

    await Wrapper.play(item);

    expect(Wrapper.playingUrl).toBe('https://example.com/live.mp3');
  });

  it('streams the remembered version when the downloaded copy is a different one', async () => {
    const item = Wrapper.queueItem('Remembered');
    await Wrapper.seedDownload(item, 'studio');
    await Wrapper.remember(item, 'live');

    await Wrapper.play(item);

    expect(Wrapper.playingUrl).toBe('https://example.com/live.mp3');
  });

  it('streams the remembered version when the downloaded copy is of unknown origin', async () => {
    const item = Wrapper.queueItem('Legacy download');
    await Wrapper.seedDownload(item);
    await Wrapper.remember(item, 'live');

    await Wrapper.play(item);

    expect(Wrapper.playingUrl).toBe('https://example.com/live.mp3');
  });

  it('plays the downloaded copy when it matches the remembered version', async () => {
    const item = Wrapper.queueItem('Matching download');
    await Wrapper.seedDownload(item, 'live');
    await Wrapper.remember(item, 'live');

    await Wrapper.play(item);

    expect(Wrapper.playingUrl).toBe(`local:${item.id}.m4a`);
  });

  it('starts the selected version at the position reached in its preview', async () => {
    const item = Wrapper.queueItem('Previewed', [STUDIO, LIVE]);
    await Wrapper.play(item);

    await Wrapper.chooseVersionAt(item, LIVE, 18.5);

    expect(Wrapper.playingUrl).toBe('https://example.com/live.mp3');
  });
});
