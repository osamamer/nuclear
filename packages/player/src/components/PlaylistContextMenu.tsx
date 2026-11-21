import { ListEnd, Play, Share } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Popover } from '@nuclearplayer/ui';

import { usePlaylistExport } from '../hooks/usePlaylistExport';
import { usePlaylistQueueActions } from '../views/Playlists/hooks/usePlaylistQueueActions';

type Props = {
  playlistId: string;
  hasTracks: boolean;
  children: ReactNode;
  anchor?: 'bottom start' | 'right start';
};

export const PlaylistContextMenu: FC<Props> = ({
  playlistId,
  hasTracks,
  children,
  anchor = 'bottom start',
}) => {
  const { t } = useTranslation('playlists');
  const { play, enqueue } = usePlaylistQueueActions(playlistId);
  const { exportAsJson } = usePlaylistExport(playlistId);

  return (
    <Popover
      trigger={children}
      triggerOn="contextmenu"
      className="relative min-w-0"
      panelClassName="surface-background px-0 py-0"
      anchor={anchor}
    >
      <Popover.Menu>
        {hasTracks && (
          <>
            <Popover.Item icon={<Play size={16} />} onClick={play}>
              {t('play')}
            </Popover.Item>
            <Popover.Item icon={<ListEnd size={16} />} onClick={enqueue}>
              {t('addToQueue')}
            </Popover.Item>
          </>
        )}
        <Popover.Item icon={<Share size={16} />} onClick={exportAsJson}>
          {t('exportJson')}
        </Popover.Item>
      </Popover.Menu>
    </Popover>
  );
};
