import { registerBuiltInCoreSettings } from '../../services/coreSettings';
import { resetInMemoryTauriStore } from '../../test/utils/inMemoryTauriStore';
import { SettingsWrapper } from './Settings.test-wrapper';

describe('Settings view', async () => {
  beforeEach(() => {
    resetInMemoryTauriStore();
    registerBuiltInCoreSettings();
  });
  it('(Snapshot) renders the settings view', async () => {
    const { getByRole } = await SettingsWrapper.mount();
    expect(getByRole('dialog')).toMatchSnapshot();
  });

  it('starts automatic playlist downloads disabled and lets the user enable them', async () => {
    await SettingsWrapper.mount();

    expect(SettingsWrapper.autoDownloadPlaylistTracks.element).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await SettingsWrapper.autoDownloadPlaylistTracks.click();
    expect(SettingsWrapper.autoDownloadPlaylistTracks.element).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
