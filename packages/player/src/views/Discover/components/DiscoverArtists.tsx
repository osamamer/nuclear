import { useNavigate } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';

import type { DiscoverArtist } from '../../../services/discover/discoverEngine';

export const DiscoverArtists: FC<{ artists: DiscoverArtist[] }> = ({
  artists,
}) => {
  const { t } = useTranslation('discovery');
  const navigate = useNavigate();

  if (artists.length === 0) {
    return null;
  }

  return (
    <section data-testid="discover-artists" className="mb-10 w-full">
      <p className="text-primary mb-1 text-xs font-bold tracking-[0.2em] uppercase">
        {t('page.artistsEyebrow')}
      </p>
      <h2 className="text-foreground mb-4 text-2xl font-bold tracking-tight">
        {t('page.artistsTitle')}
      </h2>
      <div className="flex [scrollbar-width:thin] gap-4 overflow-x-auto pb-3">
        {artists.map(({ artist, providerId, because }) => {
          const image = pickArtwork(artist.artwork, 'avatar', 200)?.url;
          return (
            <button
              key={`${providerId}-${artist.source.id}`}
              type="button"
              data-testid="discover-artist"
              onClick={() =>
                navigate({
                  to: '/artist/$providerId/$artistId',
                  params: { providerId, artistId: artist.source.id },
                })
              }
              className="group flex w-32 shrink-0 cursor-pointer flex-col items-center gap-2 text-center"
            >
              <span className="border-border bg-muted shadow-shadow flex size-28 items-center justify-center overflow-hidden rounded-full border-(length:--border-width) transition-transform group-hover:-translate-y-1">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound size={36} className="text-foreground/30" />
                )}
              </span>
              <span className="text-foreground w-full truncate text-sm font-bold">
                {artist.name}
              </span>
              {because.length > 0 && (
                <span className="text-foreground/55 line-clamp-2 w-full text-xs">
                  {t('page.becauseShort', {
                    artists: because.slice(0, 2).join(' & '),
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
