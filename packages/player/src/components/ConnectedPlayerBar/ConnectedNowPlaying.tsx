import { useNavigate } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Button, FavoriteButton, PlayerBar, Tooltip } from '@nuclearplayer/ui';

import { useFavoritesStore } from '../../stores/favoritesStore';
import { useQueueStore } from '../../stores/queueStore';
import { useVersionPickerStore } from '../../stores/versionPickerStore';

export const ConnectedNowPlaying: FC = () => {
  const { t } = useTranslation('playerBar');
  const { t: tTrack } = useTranslation('track');
  const navigate = useNavigate();
  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const { isTrackFavorite, addTrack, removeTrack } = useFavoritesStore();
  const openVersionPicker = useVersionPickerStore((state) => state.open);

  const track = currentItem?.track;
  const isFavorite = track ? isTrackFavorite(track.source) : false;

  const artwork = pickArtwork(track?.artwork, 'thumbnail', 64);
  const title = track?.title ?? t('noTrackPlaying');
  const artist = track?.artists[0]?.name ?? '';
  const artistSource = track?.artists[0]?.source;
  const album = track?.album;
  const chooseVersionLabel = tTrack('actions.chooseVersion');

  const handleToggleFavorite = () => {
    if (!track) {
      return;
    }
    if (isFavorite) {
      removeTrack(track.source);
    } else {
      addTrack(track);
    }
  };

  return (
    <PlayerBar.NowPlaying
      title={title}
      artist={artist}
      coverUrl={artwork?.url}
      onArtistClick={
        artist
          ? () => {
              if (artistSource) {
                navigate({
                  to: '/artist/$providerId/$artistId',
                  params: {
                    providerId: artistSource.provider,
                    artistId: artistSource.id,
                  },
                });
              } else {
                navigate({ to: '/search', search: { q: artist } });
              }
            }
          : undefined
      }
      onTitleClick={
        album
          ? () =>
              navigate({
                to: '/album/$providerId/$albumId',
                params: {
                  providerId: album.source.provider,
                  albumId: album.source.id,
                },
              })
          : undefined
      }
      action={
        currentItem && (
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteButton
              size="sm"
              isFavorite={isFavorite}
              onToggle={handleToggleFavorite}
              ariaLabelAdd={tTrack('actions.addToFavorites')}
              ariaLabelRemove={tTrack('actions.removeFromFavorites')}
            />
            <Tooltip content={chooseVersionLabel} side="top">
              <Button
                size="icon-sm"
                variant="text"
                className="focus-visible:ring-2 focus-visible:ring-inset"
                aria-label={chooseVersionLabel}
                aria-haspopup="dialog"
                onClick={() =>
                  openVersionPicker(currentItem.track, currentItem.playlistId)
                }
              >
                <Layers size={16} />
              </Button>
            </Tooltip>
          </div>
        )
      }
    />
  );
};
