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

  it('applies the vivid green accent preset', async () => {
    await SettingsWrapper.mount();

    await SettingsWrapper.accentColor.select('Vivid green');

    expect(SettingsWrapper.accentColor.swatch('Vivid green')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(SettingsWrapper.accentColor.applied).toBe('#1db954');
  });

  it('applies a custom accent color typed as a hex code', async () => {
    await SettingsWrapper.mount();

    await SettingsWrapper.accentColor.typeHex('#ff3366');

    expect(SettingsWrapper.accentColor.swatch('Custom')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(SettingsWrapper.accentColor.applied).toBe('#ff3366');
  });

  it('ignores incomplete hex codes', async () => {
    await SettingsWrapper.mount();

    await SettingsWrapper.accentColor.typeHex('#ff3');

    expect(SettingsWrapper.accentColor.hexInput).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(SettingsWrapper.accentColor.swatch('Custom')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
