import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Select } from '@nuclearplayer/ui';

export type PlaylistTrackSortBy =
  'playlistOrder' | 'dateAddedNewest' | 'dateAddedOldest' | 'reverse';

type PlaylistTrackSortProps = {
  value: PlaylistTrackSortBy;
  onChange: (value: PlaylistTrackSortBy) => void;
};

export const PlaylistTrackSort: FC<PlaylistTrackSortProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation('playlists');

  return (
    <div className="w-56" data-testid="sort-playlist-tracks">
      <Select
        label={t('trackSort.label')}
        size="sm"
        options={[
          {
            id: 'playlistOrder',
            label: t('trackSort.playlistOrder'),
          },
          {
            id: 'dateAddedNewest',
            label: t('trackSort.dateAddedNewest'),
          },
          {
            id: 'dateAddedOldest',
            label: t('trackSort.dateAddedOldest'),
          },
          { id: 'reverse', label: t('trackSort.reverse') },
        ]}
        value={value}
        onValueChange={(nextValue) =>
          onChange(nextValue as PlaylistTrackSortBy)
        }
      />
    </div>
  );
};
