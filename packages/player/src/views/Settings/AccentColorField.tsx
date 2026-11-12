import { Check } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';

import {
  ACCENT_COLORS,
  isAccentColor,
  type AccentColor,
} from '../../services/accentColor';
import { useSettingsStore } from '../../stores/settingsStore';

const ACCENT_COLOR_NAMES: Record<AccentColor, string> = {
  blue: 'blue',
  violet: 'violet',
  teal: 'teal',
  pink: 'pink',
  orange: 'orange',
  green: 'green',
};

export const AccentColorField: FC = () => {
  const { t } = useTranslation('preferences');
  const accentColor = useSettingsStore(
    (state) =>
      state.getValue('core.appearance.accentColor') as AccentColor | undefined,
  );
  const setValue = useSettingsStore((state) => state.setValue);
  const selectedColor =
    accentColor && isAccentColor(accentColor) ? accentColor : 'blue';

  return (
    <div className="mt-6 flex flex-col gap-3" data-testid="accent-color-field">
      <div>
        <p className="text-foreground text-sm font-semibold">
          {t('appearance.accentColor.title')}
        </p>
        <p className="text-foreground/60 mt-1 text-sm">
          {t('appearance.accentColor.description')}
        </p>
      </div>
      <div
        aria-label={t('appearance.accentColor.title')}
        className="flex flex-wrap items-center gap-3"
        role="group"
      >
        {Object.entries(ACCENT_COLORS).map(([colorName, accent]) => {
          const color = colorName as AccentColor;
          const isSelected = selectedColor === color;

          return (
            <button
              key={color}
              aria-label={t(
                `appearance.accentColor.options.${ACCENT_COLOR_NAMES[color]}`,
              )}
              aria-pressed={isSelected}
              className="border-border focus-visible:ring-ring focus-visible:ring-offset-background flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => {
                void setValue('core.appearance.accentColor', color);
              }}
              style={{ backgroundColor: accent.color }}
              title={t(
                `appearance.accentColor.options.${ACCENT_COLOR_NAMES[color]}`,
              )}
              type="button"
            >
              {isSelected && (
                <Check size={16} style={{ color: accent.foreground }} />
              )}
            </button>
          );
        })}
        <span className="text-foreground/70 text-sm">
          {t(
            `appearance.accentColor.options.${ACCENT_COLOR_NAMES[selectedColor]}`,
          )}
        </span>
      </div>
    </div>
  );
};
