import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockIPC } from '@tauri-apps/api/mocks';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { parseLightProfilePlaylists } from '../../services/lightProfile';
import { providersHost } from '../../services/providersHost';
import type { LightProfile } from '../../services/tauri/bindings';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { MetadataProviderBuilder } from '../../test/builders/MetadataProviderBuilder';
import {
  GIANT_STEPS_REF,
  GIANT_STEPS_TRACKS,
} from '../../test/fixtures/albums';
import { LightProfiles } from './LightProfiles';

const LightProfilesWrapper = {
  mount() {
    const queryClient = new QueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <LightProfiles />
      </QueryClientProvider>,
    );
  },
  favoriteAlbum(profile: string, title: string) {
    return within(screen.getByTestId(`light-profile-${profile}`)).getByRole(
      'checkbox',
      { name: title },
    );
  },
  findLauncher(name: string) {
    return screen.findByText(`Nuclear (${name})`);
  },
};

describe('Light profiles', () => {
  it('saves a favorite album only for the selected profile and lets it be removed after reopening settings', async () => {
    const user = userEvent.setup();
    let profiles: LightProfile[] = [
      { name: 'calm', playlistIds: ['existing-playlist'] },
      { name: 'focus', playlistIds: [], albums: [] },
    ];
    mockIPC((command, args) => {
      if (command === 'light_profiles_list') {
        return profiles;
      }
      if (command === 'light_profiles_save') {
        profiles = (args as { profiles: LightProfile[] }).profiles;
      }
    });
    useFavoritesStore.setState({
      albums: [{ ref: GIANT_STEPS_REF, addedAtIso: '2026-11-20T00:00:00Z' }],
    });
    providersHost.register(
      MetadataProviderBuilder.albumDetailsProvider().build(),
    );

    const view = LightProfilesWrapper.mount();
    await LightProfilesWrapper.findLauncher('calm');
    await user.click(LightProfilesWrapper.favoriteAlbum('calm', 'Giant Steps'));

    await waitFor(() =>
      expect(
        LightProfilesWrapper.favoriteAlbum('calm', 'Giant Steps'),
      ).toBeChecked(),
    );
    expect(
      LightProfilesWrapper.favoriteAlbum('focus', 'Giant Steps'),
    ).not.toBeChecked();
    expect(profiles[0]?.playlistIds).toEqual(['existing-playlist']);
    const [playlist] = parseLightProfilePlaylists(
      (profiles[0]?.albums ?? []).map((album) => album.playlistJson),
    );
    expect(playlist?.isReadOnly).toBe(true);
    expect(playlist?.items.map((item) => item.track)).toEqual(
      GIANT_STEPS_TRACKS,
    );

    view.unmount();
    useFavoritesStore.setState({ albums: [] });
    LightProfilesWrapper.mount();
    await LightProfilesWrapper.findLauncher('calm');
    expect(
      LightProfilesWrapper.favoriteAlbum('calm', 'Giant Steps'),
    ).toBeChecked();
    await user.click(LightProfilesWrapper.favoriteAlbum('calm', 'Giant Steps'));
    await waitFor(() => expect(profiles[0]?.albums).toEqual([]));
  });
});
