import { Disc3, EllipsisVertical, ListEnd, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork, Track } from '@nuclearplayer/model';
import { Button, openNearestTrackContextMenu } from '@nuclearplayer/ui';

import { ConnectedTrackContextMenu } from '../../../components/ConnectedTrackContextMenu';
import { useQueueActions } from '../../../hooks/useQueueActions';
import { playbackManager } from '../../../services/playback';

export type DeckEntry = {
  id: string;
  track: Track;
  note?: string;
};

type TrackCardProps = {
  entry: DeckEntry;
  index: number;
  onPlay: () => void;
};

const TrackCard: FC<TrackCardProps> = ({ entry, index, onPlay }) => {
  const { t } = useTranslation('discovery');
  const { track, note } = entry;
  const artwork = pickArtwork(track.artwork, 'cover', 300)?.url;
  const artists = track.artists.map((artist) => artist.name).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.25 }}
      className="min-w-0"
    >
      <div
        data-testid="discover-track-card"
        onContextMenu={openNearestTrackContextMenu}
        className="border-border bg-background shadow-shadow group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-(length:--border-width)"
      >
        <button
          type="button"
          data-testid="discover-track-play"
          aria-label={t('page.playTrack', { title: track.title })}
          onClick={onPlay}
          className="bg-muted relative aspect-square w-full cursor-pointer overflow-hidden"
        >
          {artwork ? (
            <img
              src={artwork}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Disc3 size={44} className="text-foreground/25" />
            </div>
          )}
          <span className="bg-background/0 group-hover:bg-background/25 absolute inset-0 flex items-center justify-center transition-colors">
            <span className="bg-primary text-primary-foreground border-border shadow-shadow flex size-12 scale-90 items-center justify-center rounded-full border-(length:--border-width) opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
              <Play size={20} fill="currentColor" />
            </span>
          </span>
        </button>
        <div className="flex min-w-0 items-start gap-1 p-3">
          <div className="min-w-0 flex-1">
            <span
              data-testid="discover-track-title"
              className="text-foreground block truncate text-sm font-bold"
            >
              {track.title}
            </span>
            <span className="text-foreground/60 block truncate text-xs">
              {artists}
            </span>
            {note && (
              <span
                data-testid="discover-track-note"
                className="text-primary mt-1.5 line-clamp-2 block text-xs leading-snug font-medium"
              >
                {note}
              </span>
            )}
          </div>
          <ConnectedTrackContextMenu track={track}>
            <Button
              size="icon-sm"
              variant="text"
              data-testid="discover-track-menu"
              aria-label={t('page.trackOptions')}
            >
              <EllipsisVertical size={16} />
            </Button>
          </ConnectedTrackContextMenu>
        </div>
      </div>
    </motion.div>
  );
};

type TrackDeckProps = {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  entries: DeckEntry[];
  actions?: ReactNode;
  'data-testid'?: string;
};

export const TrackDeck: FC<TrackDeckProps> = ({
  title,
  eyebrow,
  subtitle,
  entries,
  actions,
  'data-testid': dataTestId,
}) => {
  const { t } = useTranslation('discovery');
  const queueActions = useQueueActions();
  const tracks = entries.map((entry) => entry.track);

  return (
    <section data-testid={dataTestId} className="mb-10 w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-primary mb-1 text-xs font-bold tracking-[0.2em] uppercase">
              {eyebrow}
            </p>
          )}
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-foreground/60 mt-1 text-sm">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            size="sm"
            data-testid="deck-queue-all"
            disabled={tracks.length === 0}
            onClick={() => queueActions.addToQueue(tracks)}
          >
            <ListEnd size={16} className="mr-1.5" />
            {t('page.queueAll')}
          </Button>
          <Button
            size="sm"
            data-testid="deck-play-all"
            disabled={tracks.length === 0}
            onClick={() => playbackManager.playTracks(tracks)}
          >
            <Play size={16} className="mr-1.5" />
            {t('page.playAll')}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {entries.map((entry, index) => (
          <TrackCard
            key={entry.id}
            entry={entry}
            index={index}
            onPlay={() => playbackManager.playTracks(tracks, undefined, index)}
          />
        ))}
      </div>
    </section>
  );
};
