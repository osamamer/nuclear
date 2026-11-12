import type { ArtworkSet, PlaylistItem } from '@nuclearplayer/model';
import { pickArtwork } from '@nuclearplayer/model';
import { MOSAIC_SIZE } from '@nuclearplayer/ui';

type PlaylistWithItems = {
  artwork?: ArtworkSet;
  items: PlaylistItem[];
};

const getUniqueTrackArtworkUrls = (playlist: PlaylistWithItems): string[] => {
  const urls: string[] = [];
  const seenUrls = new Set<string>();

  for (const item of playlist.items) {
    const url = pickArtwork(item.track.artwork, 'cover', 300)?.url;
    if (url !== undefined && !seenUrls.has(url)) {
      seenUrls.add(url);
      urls.push(url);
      if (urls.length === MOSAIC_SIZE) {
        break;
      }
    }
  }

  return urls;
};

export const buildThumbnails = (playlist: PlaylistWithItems): string[] => {
  const customUrl = pickArtwork(playlist.artwork, 'cover', 300)?.url;
  if (customUrl) {
    return [customUrl];
  }

  const uniqueUrls = getUniqueTrackArtworkUrls(playlist);

  if (uniqueUrls.length === MOSAIC_SIZE) {
    return uniqueUrls;
  }

  return uniqueUrls.slice(0, 1);
};
