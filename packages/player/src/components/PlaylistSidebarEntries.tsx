import { Music2 } from 'lucide-react';
import type { FC } from 'react';

import { SidebarNavigationItem } from '@nuclearplayer/ui';

import { PlaylistIndexTree } from '../stores/PlaylistIndexTree';
import { usePlaylistStore } from '../stores/playlistStore';

export const PlaylistSidebarEntries: FC = () => {
  const index = usePlaylistStore((state) => state.index);
  const playlists = new PlaylistIndexTree(index).playlists();

  if (playlists.length === 0) {
    return null;
  }

  return (
    <div className="border-foreground/15 ml-5 flex flex-col gap-1 border-l pl-2">
      {playlists.map((playlist) => (
        <SidebarNavigationItem
          key={playlist.id}
          to={`/playlists/${encodeURIComponent(playlist.id)}`}
          icon={<Music2 />}
          label={playlist.name}
          exact
        />
      ))}
    </div>
  );
};
