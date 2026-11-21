import { PencilIcon } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Playlist } from '@nuclearplayer/model';
import {
  Badge,
  Button,
  cn,
  formatTimeMillis,
  Input,
  Textarea,
  Tooltip,
} from '@nuclearplayer/ui';

import { usePlaylistPreferencesStore } from '../../../stores/playlistPreferencesStore';
import { PlaylistArtwork } from './PlaylistArtwork';
import { usePlaylistDetailHeader } from './usePlaylistDetailHeader';

type PlaylistDetailHeaderProps = {
  playlist: Playlist;
  thumbnails?: string[];
  className?: string;
  children?: ReactNode;
  controls?: ReactNode;
};

export const PlaylistDetailHeader: FC<PlaylistDetailHeaderProps> = ({
  playlist,
  thumbnails,
  className,
  children,
  controls,
}) => {
  const { t } = useTranslation('playlists');
  const lastPlayed = usePlaylistPreferencesStore(
    (state) => state.lastPlayedByPlaylist[playlist.id],
  );
  const dates = [
    { key: 'createdDate', date: new Date(playlist.createdAtIso) },
    ...(playlist.createdAtIso === playlist.lastModifiedIso
      ? []
      : [{ key: 'updatedDate', date: new Date(playlist.lastModifiedIso) }]),
    ...(lastPlayed === undefined
      ? []
      : [{ key: 'lastPlayedDate', date: new Date(lastPlayed) }]),
  ] as const;
  const totalDurationMs = playlist.items.reduce(
    (total, item) => total + (item.track.durationMs ?? 0),
    0,
  );
  const {
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
  } = usePlaylistDetailHeader(playlist);

  return (
    <section
      className={cn(
        'border-foreground/10 bg-card @container relative isolate flex flex-col overflow-hidden rounded-2xl border',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="from-primary/30 via-card to-background pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-radial-[at_80%_0%]"
      >
        {thumbnails?.[0] && (
          <img
            src={thumbnails[0]}
            alt=""
            decoding="async"
            className="absolute inset-0 size-full scale-110 object-cover opacity-65 blur-3xl"
          />
        )}
        <div className="from-background via-background/65 pointer-events-none absolute inset-0 bg-linear-to-t to-transparent" />
      </div>
      {!playlist.isReadOnly && !isEditing && (
        <Button
          variant="text"
          size="icon-sm"
          className="bg-background/55 absolute top-3 right-3 z-10 rounded-full backdrop-blur-sm"
          onClick={startEditing}
          aria-label={t('common:actions.edit')}
          data-testid="edit-playlist-button"
        >
          <PencilIcon size={14} />
        </Button>
      )}
      {playlist.isReadOnly && playlist.origin && (
        <div className="absolute top-3 right-3 z-10">
          <Tooltip
            content={t('readOnlyTooltip', { source: playlist.origin.provider })}
            side="bottom"
          >
            <Badge variant="pill" color="cyan" data-testid="read-only-badge">
              {t('readOnlyBadge', { source: playlist.origin.provider })}
            </Badge>
          </Tooltip>
        </div>
      )}
      <div className="flex min-w-0 items-end gap-4 px-4 pt-6 pb-4 @md:gap-6 @md:px-6 @md:pt-8 @md:pb-5">
        <div className="bg-background/55 motion-safe:animate-in motion-safe:fade-in-70 motion-safe:zoom-in-95 aspect-square w-[clamp(4.75rem,18cqw,10rem)] shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 shadow-black/25 ring-white/10 select-none motion-safe:transition-transform motion-safe:duration-400 motion-safe:hover:-translate-y-1">
          <PlaylistArtwork
            name={playlist.name}
            thumbnails={
              isEditing
                ? editArtworkUrl.trim()
                  ? [editArtworkUrl.trim()]
                  : []
                : thumbnails
            }
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 pr-7">
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                data-testid="playlist-detail-title-input"
                className="font-heading text-3xl font-extrabold"
              />
              <Input
                value={editArtworkUrl}
                onChange={(event) => setEditArtworkUrl(event.target.value)}
                label={t('artworkUrl')}
                placeholder={t('artworkUrlPlaceholder')}
                data-testid="playlist-detail-artwork-input"
              />
              <Textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder={t('descriptionPlaceholder')}
                data-testid="playlist-detail-description-input"
                className="min-h-[4rem] text-lg"
              />
              <div className="flex gap-2">
                <Button
                  variant="tertiary"
                  onClick={save}
                  data-testid="save-edit-button"
                >
                  {t('common:actions.save')}
                </Button>
                <Button
                  variant="tertiary"
                  onClick={cancel}
                  data-testid="cancel-edit-button"
                >
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="motion-safe:animate-in motion-safe:fade-in-70 motion-safe:slide-in-from-bottom-2 flex min-w-0 flex-col gap-2 motion-safe:duration-400">
              <h1
                className="font-heading text-[clamp(1.5rem,6cqw,3.75rem)] leading-none font-extrabold tracking-tight"
                dir="auto"
                data-testid="playlist-detail-title"
              >
                {playlist.name}
              </h1>
              {playlist.description && (
                <p
                  className="text-foreground/75 line-clamp-2 text-sm @md:text-base"
                  dir="auto"
                  data-testid="playlist-detail-description"
                >
                  {playlist.description}
                </p>
              )}
              <div
                className="text-foreground/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums"
                data-testid="playlist-detail-stats"
              >
                <span>{t('trackCount', { count: playlist.items.length })}</span>
                {totalDurationMs > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatTimeMillis(totalDurationMs)}</span>
                  </>
                )}
              </div>
              <div
                className="text-foreground/60 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                data-testid="playlist-detail-dates"
              >
                {dates
                  .filter(({ date }) => Number.isFinite(date.getTime()))
                  .map(({ key, date }) => (
                    <time key={key} dateTime={date.toISOString()}>
                      {t(key, { date })}
                    </time>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {!isEditing && (children || controls) && (
        <div className="border-foreground/10 bg-background/45 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2 @md:px-6">
          {children}
          {controls && (
            <div className="flex min-w-0 flex-[1_1_20rem] flex-wrap items-center justify-end gap-2 [&>*]:w-auto [&>*]:min-w-0 [&>*]:flex-1 @lg:[&>*]:max-w-48">
              {controls}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
