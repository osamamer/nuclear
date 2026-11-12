import { EllipsisVerticalIcon, PlayIcon, PlusIcon } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { Button, cn, Popover } from '@nuclearplayer/ui';

import { useQueueActions } from '../../../hooks/useQueueActions';
import { playbackManager } from '../../../services/playback';

type PlaylistActionsProps = {
  tracks: Track[];
  playlistId?: string;
  menuItems?: ReactNode;
  className?: string;
};

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  tracks,
  playlistId,
  menuItems,
  className,
}) => {
  const { t } = useTranslation('playlists');
  const { addToQueue } = useQueueActions();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="default"
        size="icon"
        className="size-12 rounded-full"
        onClick={() => {
          playbackManager.playTracks(tracks, playlistId);
        }}
        aria-label={t('play')}
        data-testid="play-all-button"
      >
        <PlayIcon size={22} fill="currentColor" />
      </Button>
      <Popover
        className="relative"
        panelClassName="surface-background px-0 py-0"
        trigger={
          <Button
            variant="tertiary"
            size="icon"
            data-testid="playlist-actions-button"
          >
            <EllipsisVerticalIcon size={16} />
          </Button>
        }
        anchor="bottom start"
      >
        <Popover.Menu>
          <Popover.Item
            icon={<PlusIcon size={16} />}
            onClick={() => {
              addToQueue(tracks, playlistId);
            }}
            data-testid="add-to-queue-action"
          >
            {t('addToQueue')}
          </Popover.Item>
          {menuItems}
        </Popover.Menu>
      </Popover>
    </div>
  );
};
