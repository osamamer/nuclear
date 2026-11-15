import { type FC } from 'react';

import type { PlaylistIndexNode } from '@nuclearplayer/model';
import { CardGrid } from '@nuclearplayer/ui';

import { FolderCard } from './FolderCard';
import { PlaylistCard } from './PlaylistCard';

const MAX_SORTABLE_PLAYLISTS = 20;

type PlaylistCardGridProps = {
  entries: PlaylistIndexNode[];
  onPlaylistClick: (id: string) => void;
  onFolderClick: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMoveIntoFolder: (playlistId: string, folderId: string) => void;
  isReorderable: boolean;
};

export const PlaylistCardGrid: FC<PlaylistCardGridProps> = ({
  entries,
  onPlaylistClick,
  onFolderClick,
  onReorder,
  onMoveIntoFolder,
  isReorderable,
}) => {
  const cards = entries.map((entry) => {
    if (entry.kind === 'folder') {
      return {
        id: entry.id,
        content: (
          <FolderCard folder={entry} onClick={() => onFolderClick(entry.id)} />
        ),
      };
    }

    return {
      id: entry.id,
      content: (
        <PlaylistCard
          playlist={entry}
          onClick={() => onPlaylistClick(entry.id)}
        />
      ),
    };
  });
  const kindOf = (id: string) => entries.find((entry) => entry.id === id)?.kind;

  if (!isReorderable || entries.length > MAX_SORTABLE_PLAYLISTS) {
    return (
      <CardGrid className="gap-x-7 pt-3 pl-3.5">
        {cards.map(({ id, content }) => (
          <div key={id} className="relative w-fit">
            {content}
          </div>
        ))}
      </CardGrid>
    );
  }

  return (
    <CardGrid.Sortable
      itemIds={entries.map((entry) => entry.id)}
      onReorder={onReorder}
      canDropInto={(activeId, targetId) =>
        kindOf(activeId) === 'playlist' && kindOf(targetId) === 'folder'
      }
      onDropInto={onMoveIntoFolder}
      disabled={!isReorderable}
    >
      {cards.map(({ id, content }) => (
        <CardGrid.SortableItem key={id} id={id}>
          {content}
        </CardGrid.SortableItem>
      ))}
    </CardGrid.Sortable>
  );
};
