import { Play } from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Popover } from '@nuclearplayer/ui';

import { usePlaylistStore } from '../stores/playlistStore';
import { DeletePlaylistDialog } from '../views/Playlists/components/DeletePlaylistDialog';
import { MoveToFolderDialog } from '../views/Playlists/components/MoveToFolderDialog';
import { PlaylistCardMenuItems } from '../views/Playlists/components/PlaylistCardMenuItems';
import { usePlaylistFolderActions } from '../views/Playlists/hooks/usePlaylistFolderActions';
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
  const { currentFolder, destinations, moveToFolder, removeFromFolder } =
    usePlaylistFolderActions(playlistId);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);
  const [dialog, setDialog] = useState<'move' | 'delete' | null>(null);
  const closeDialog = () => setDialog(null);

  return (
    <>
      <Popover
        trigger={children}
        triggerOn="contextmenu"
        className="relative min-w-0"
        panelClassName="surface-background z-50 px-0 py-0"
        anchor={anchor}
      >
        <Popover.Menu>
          {hasTracks && (
            <Popover.Item icon={<Play size={16} />} onClick={play}>
              {t('play')}
            </Popover.Item>
          )}
          <PlaylistCardMenuItems
            playlistId={playlistId}
            onAddToQueue={hasTracks ? enqueue : undefined}
            onDelete={() => setDialog('delete')}
            canMoveToFolder={destinations.length > 0}
            isInFolder={Boolean(currentFolder)}
            onMoveToFolder={() => setDialog('move')}
            onRemoveFromFolder={removeFromFolder}
          />
        </Popover.Menu>
      </Popover>
      <DeletePlaylistDialog
        isOpen={dialog === 'delete'}
        onClose={closeDialog}
        onConfirm={async () => {
          closeDialog();
          await deletePlaylist(playlistId);
        }}
      />
      <MoveToFolderDialog
        isOpen={dialog === 'move'}
        folders={destinations}
        onClose={closeDialog}
        onSelect={async (folderId) => {
          closeDialog();
          await moveToFolder(folderId);
        }}
      />
    </>
  );
};
