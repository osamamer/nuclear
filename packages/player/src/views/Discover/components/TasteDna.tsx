import { Dna } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { cn } from '@nuclearplayer/ui';

import type { TasteArtist } from '../../../services/discover/tasteProfile';
import { useDiscoverStore } from '../../../stores/discoverStore';

const DNA_SIZE = 14;

export const TasteDna: FC<{ artists: TasteArtist[] }> = ({ artists }) => {
  const { t } = useTranslation('discovery');
  const seeds = useDiscoverStore((state) => state.seeds);
  const setSeeds = useDiscoverStore((state) => state.setSeeds);
  const top = artists.slice(0, DNA_SIZE);
  const maxWeight = Math.max(1e-6, ...top.map((artist) => artist.weight));

  const toggle = (name: string) =>
    setSeeds(
      seeds.includes(name)
        ? seeds.filter((seed) => seed !== name)
        : [...seeds, name],
    );

  return (
    <section data-testid="discover-taste-dna" className="mb-8 w-full">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-foreground flex items-center gap-2 text-lg font-bold">
          <Dna size={18} className="text-primary" />
          {t('page.tasteDna')}
        </h2>
        <span className="text-foreground/55 text-xs">
          {seeds.length > 0
            ? t('page.steeringWith', { count: seeds.length })
            : t('page.tasteDnaHint')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {top.map((artist) => {
          const isSelected = seeds.includes(artist.name);
          const strength = 0.35 + 0.65 * (artist.weight / maxWeight);
          return (
            <button
              key={artist.name}
              type="button"
              data-testid="taste-dna-chip"
              aria-pressed={isSelected}
              onClick={() => toggle(artist.name)}
              className={cn(
                'border-border flex cursor-pointer items-center gap-2 rounded-full border-(length:--border-width) py-1 pr-3 pl-1 text-sm font-semibold transition-all',
                isSelected
                  ? 'bg-foreground text-background shadow-shadow -translate-y-0.5'
                  : 'bg-background text-foreground hover:bg-primary/10',
              )}
            >
              <span
                className="bg-primary flex size-6 items-center justify-center overflow-hidden rounded-full"
                style={{ opacity: isSelected ? 1 : strength }}
              >
                {artist.imageUrl && (
                  <img
                    src={artist.imageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              {artist.name}
            </button>
          );
        })}
        {seeds.length > 0 && (
          <button
            type="button"
            data-testid="taste-dna-reset"
            onClick={() => setSeeds([])}
            className="text-foreground/60 hover:text-foreground cursor-pointer px-2 text-sm underline-offset-4 hover:underline"
          >
            {t('page.resetSeeds')}
          </button>
        )}
      </div>
    </section>
  );
};
