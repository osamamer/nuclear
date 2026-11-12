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
  StatChip,
  Textarea,
  Tooltip,
} from '@nuclearplayer/ui';

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
    <div
      className={cn(
        'border-border bg-card/50 text-card-foreground relative flex flex-col gap-4 rounded-2xl border-(length:--border-width) p-4 md:flex-row',
        className,
      )}
    >
      {!playlist.isReadOnly && !isEditing && (
        <Button
          variant="tertiary"
          size="icon-sm"
          className="absolute top-4 right-4 z-10"
          onClick={startEditing}
          data-testid="edit-playlist-button"
        >
          <PencilIcon size={14} />
        </Button>
      )}
      {playlist.isReadOnly && playlist.origin && (
        <div className="absolute top-4 right-4 z-10">
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
      <div className="border-border h-48 w-48 shrink-0 overflow-hidden rounded-2xl border-(length:--border-width) select-none">
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

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
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
            <div className="flex flex-col gap-2">
              <h1
                className="font-heading text-4xl font-extrabold tracking-tight"
                data-testid="playlist-detail-title"
              >
                {playlist.name}
              </h1>
              {playlist.description && (
                <p
                  className="text-card-foreground/60 text-lg"
                  data-testid="playlist-detail-description"
                >
                  {playlist.description}
                </p>
              )}
            </div>
          )}

          {children}

          {!isEditing && (
            <div
              className="flex flex-wrap gap-2"
              data-testid="playlist-detail-stats"
            >
              <StatChip
                value={playlist.items.length}
                label={t('sortBy.trackCount')}
              />
              <StatChip
                value={
                  totalDurationMs > 0 ? formatTimeMillis(totalDurationMs) : '—'
                }
                label={t('sortBy.duration')}
              />
            </div>
          )}
        </div>

        {!isEditing && controls && (
          <div className="flex w-full flex-col gap-2 lg:w-56 lg:shrink-0 lg:pt-10">
            {controls}
          </div>
        )}
      </div>
    </div>
  );
};
