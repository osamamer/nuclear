import type { ProviderRef } from '@nuclearplayer/model';

const isWebUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

export const playlistResultUrl = ({ provider, id, url }: ProviderRef) => {
  if (url && isWebUrl(url)) {
    return url;
  }
  if (isWebUrl(id)) {
    return id;
  }

  const spotifyUri = /^spotify:playlist:([A-Za-z0-9]+)$/.exec(url ?? id);
  if (spotifyUri) {
    return `https://open.spotify.com/playlist/${spotifyUri[1]}`;
  }

  switch (provider.toLowerCase()) {
    case 'spotify':
      return /^[A-Za-z0-9]+$/.test(id)
        ? `https://open.spotify.com/playlist/${id}`
        : undefined;
    case 'youtube':
    case 'youtube-music':
    case 'ytmusic':
      return /^[\w-]+$/.test(id)
        ? `https://www.youtube.com/playlist?list=${id}`
        : undefined;
  }
};
