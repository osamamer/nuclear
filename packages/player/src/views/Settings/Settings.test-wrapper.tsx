import { render, RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../App';
import { registerBuiltInCoreSettings } from '../../services/coreSettings';
import { initializeSettingsStore } from '../../stores/settingsStore';

export const SettingsWrapper = {
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
