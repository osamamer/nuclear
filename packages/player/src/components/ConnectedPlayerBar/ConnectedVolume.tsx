import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { PlayerBar } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../hooks/useCoreSetting';

export const ConnectedVolume: FC = () => {
  const [volume, setVolume] = useCoreSetting<number>('playback.volume');
  const [muted, setMuted] = useCoreSetting<boolean>('playback.muted');
  const { t } = useTranslation();

  const handleVolumeChange = (value: number) => {
    setVolume(value / 100);
  };

  return (
    <PlayerBar.Volume
      value={Math.round((volume ?? 1) * 100)}
      onValueChange={handleVolumeChange}
      muted={muted}
      onMutedChange={setMuted}
      muteLabel={t('common.actions.mute')}
      unmuteLabel={t('common.actions.unmute')}
    />
  );
};
