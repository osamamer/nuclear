import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, RenderResult, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DialogWrapper } from '@nuclearplayer/ui';

import App from '../../App';
import { routeTree } from '../../routeTree.gen';
import { usePlaylistStore } from '../../stores/playlistStore';
import { PlaylistBuilder } from '../../test/builders/PlaylistBuilder';

const user = userEvent.setup();

export const PlaylistDetailWrapper = {
  seedPlaylist(builder: PlaylistBuilder) {
    const playlist = builder.build();
    usePlaylistStore.setState({
      index: [builder.buildIndexEntry()],
      playlists: new Map([[playlist.id, playlist]]),
      loaded: true,
    });
  },

  async mount(playlistId: string): Promise<RenderResult> {
    const history = createMemoryHistory({
      initialEntries: [`/playlists/${playlistId}`],
    });
    const router = createRouter({ routeTree, history });
    const component = render(<App routerProp={router} />);
    await screen.findByTestId('playlist-detail-view');
    return component;
  },

  title: {
    get display() {
      return screen.getByTestId('playlist-detail-title');
    },
    get input() {
      return screen.queryByTestId('playlist-detail-title-input');
    },
    async edit(newValue: string) {
      await user.click(screen.getByTestId('edit-playlist-button'));
      const input = screen.getByTestId('playlist-detail-title-input');
      await user.clear(input);
      await user.type(input, newValue);
      await user.click(screen.getByTestId('save-edit-button'));
    },
  },

  description: {
    get display() {
      return screen.queryByTestId('playlist-detail-description');
    },
    get input() {
      return screen.queryByTestId('playlist-detail-description-input');
    },
    async edit(newValue: string) {
      await user.click(screen.getByTestId('edit-playlist-button'));
      const input = screen.getByTestId('playlist-detail-description-input');
      await user.clear(input);
      await user.type(input, newValue);
      await user.click(screen.getByTestId('save-edit-button'));
    },
  },

  editButton: {
    get element() {
      return screen.queryByTestId('edit-playlist-button');
    },
    async click() {
      await user.click(screen.getByTestId('edit-playlist-button'));
    },
  },

  get trackTable() {
    return screen.queryByRole('table');
  },
  trackTitle(name: string) {
    return screen.queryByText(name);
  },

  async playTrack(name: string) {
    await user.click(screen.getByRole('button', { name, exact: true }));
  },
  get readOnlyBadge() {
    return screen.queryByTestId('read-only-badge');
  },
  get emptyState() {
    return screen.queryByTestId('empty-state');
  },
  get artworkImages() {
    return screen.queryAllByRole('img');
  },

  actionsButton: {
    get element() {
      return screen.getByTestId('playlist-actions-button');
    },
    async click() {
      await user.click(this.element);
    },
  },

  exportJsonOption: {
    get element() {
      return screen.getByTestId('export-json-action');
    },
    async click() {
      await PlaylistDetailWrapper.actionsButton.click();
      await user.click(this.element);
    },
  },

  deleteDialog: {
    isOpen: () => DialogWrapper.isOpen(),
    async openFromActions() {
      await PlaylistDetailWrapper.actionsButton.click();
      await user.click(screen.getByTestId('delete-playlist-action'));
    },
    confirmButton: {
      get element() {
        return DialogWrapper.getByText('Delete');
      },
      async click() {
        await user.click(this.element);
      },
    },
  },

  playButton: {
    get element() {
      return screen.getByTestId('play-all-button');
    },
    async click() {
      await user.click(this.element);
    },
  },

  async addToQueueFromActions() {
    await PlaylistDetailWrapper.actionsButton.click();
    await user.click(screen.getByTestId('add-to-queue-action'));
  },

  get playlistsListView() {
    return screen.queryByTestId('playlists-view');
  },

  get trackMenuLabels() {
    return within(screen.getByRole('menu'))
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
  },

  async openTrackMenu(trackTitle: string) {
    const row = screen
      .getByRole('button', { name: trackTitle, exact: true })
      .closest('tr')!;
    await user.click(within(row).getByTestId('track-context-menu-button'));
  },

  async removeTrack(trackTitle: string) {
    await user.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('button', { name: trackTitle, exact: true }),
    });
    await user.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' }),
    );
  },
};
