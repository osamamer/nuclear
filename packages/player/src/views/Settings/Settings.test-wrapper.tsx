import { render, RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../App';
import { registerBuiltInCoreSettings } from '../../services/coreSettings';
import { initializeSettingsStore } from '../../stores/settingsStore';

export const SettingsWrapper = {
  accentColor: {
    swatch(name: string) {
      return screen.getByRole('button', { name });
    },
    async select(name: string) {
      await userEvent.click(this.swatch(name));
    },
    get hexInput() {
      return screen.getByRole('textbox', {
        name: 'Custom accent color hex code',
      });
    },
    async typeHex(value: string) {
      await userEvent.clear(this.hexInput);
      await userEvent.type(this.hexInput, value);
    },
    get applied() {
      return document.documentElement.style.getPropertyValue('--accent-color');
    },
  },

  autoDownloadPlaylistTracks: {
    get element() {
      return screen.getByRole('switch', {
        name: 'Automatically download selected playlists',
      });
    },
    async click() {
      await userEvent.click(this.element);
    },
  },

  async mount(): Promise<RenderResult> {
    await initializeSettingsStore();
    registerBuiltInCoreSettings();
    const component = render(<App />);
    await userEvent.click(
      await component.findByRole('button', { name: 'Preferences' }),
    );
    await screen.findByRole('heading', { name: 'General', level: 1 });

    return component;
  },
};
