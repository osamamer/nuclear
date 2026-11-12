import { useState } from 'react';

import { pickArtwork, type Playlist } from '@nuclearplayer/model';

import { usePlaylistStore } from '../../../stores/playlistStore';

export const usePlaylistDetailHeader = (playlist: Playlist) => {
  const updatePlaylist = usePlaylistStore((state) => state.updatePlaylist);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(playlist.name);
  const [editArtworkUrl, setEditArtworkUrl] = useState(
    pickArtwork(playlist.artwork, 'cover', 300)?.url ?? '',
  );
  const [editDescription, setEditDescription] = useState(
    playlist.description ?? '',
  );

  const startEditing = () => setIsEditing(true);

  const save = () => {
    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();

    const artworkUrl = editArtworkUrl.trim();
    const currentArtworkUrl =
      pickArtwork(playlist.artwork, 'cover', 300)?.url ?? '';
    const updates: Partial<Pick<Playlist, 'name' | 'description' | 'artwork'>> =
      {};
    if (trimmedName && trimmedName !== playlist.name) {
      updates.name = trimmedName;
    }
    if (trimmedDescription !== (playlist.description ?? '')) {
      updates.description = trimmedDescription || undefined;
    }
    if (artworkUrl !== currentArtworkUrl) {
      updates.artwork = artworkUrl
        ? { items: [{ url: artworkUrl, purpose: 'cover' }] }
        : undefined;
    }

    if (Object.keys(updates).length > 0) {
      updatePlaylist(playlist.id, updates);
    }

    setIsEditing(false);
  };

  const cancel = () => {
    setEditName(playlist.name);
    setEditArtworkUrl(pickArtwork(playlist.artwork, 'cover', 300)?.url ?? '');
    setEditDescription(playlist.description ?? '');
    setIsEditing(false);
  };

  return {
    isEditing,
    editName,
    setEditName,
    editArtworkUrl,
    setEditArtworkUrl,
    editDescription,
    setEditDescription,
    startEditing,
    save,
    cancel,
  };
};
