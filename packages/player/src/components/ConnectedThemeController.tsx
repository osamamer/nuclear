import { FC, useEffect } from 'react';

import { ThemeController } from '@nuclearplayer/ui';

import { useCoreSetting } from '../hooks/useCoreSetting';
import { applyAccentColor } from '../services/accentColor';

export const ConnectedThemeController: FC = () => {
  const [isDark, setIsDark] = useCoreSetting<boolean>('theme.dark');
  const [accentColor] = useCoreSetting<string>('appearance.accentColor');

  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  return (
    <ThemeController
      isDark={isDark ?? false}
      onThemeChange={setIsDark}
      className="justify-self-end"
    />
  );
};
