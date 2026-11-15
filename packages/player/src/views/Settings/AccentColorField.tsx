import { Check, Pipette } from 'lucide-react';
import { ChangeEvent, FC, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';

import {
  ACCENT_COLORS,
  DEFAULT_CUSTOM_ACCENT_COLOR,
  foregroundForColor,
  isAccentColor,
  isHexColor,
  type AccentColor,
  type PresetAccentColor,
} from '../../services/accentColor';
import { useSettingsStore } from '../../stores/settingsStore';

const swatchClassName =
  'border-border focus-visible:ring-ring focus-visible:ring-offset-background flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

export const AccentColorField: FC = () => {
  const { t } = useTranslation('preferences');
  const accentColor = useSettingsStore(
    (state) =>
      state.getValue('core.appearance.accentColor') as string | undefined,
  );
  const storedCustomColor = useSettingsStore(
    (state) =>
      state.getValue('core.appearance.customAccentColor') as string | undefined,
  );
  const setValue = useSettingsStore((state) => state.setValue);

  const selectedColor: AccentColor =
    accentColor && isAccentColor(accentColor) ? accentColor : 'blue';
  const customColor =
    storedCustomColor && isHexColor(storedCustomColor)
      ? storedCustomColor.toLowerCase()
      : DEFAULT_CUSTOM_ACCENT_COLOR;
  const isCustomSelected = selectedColor === 'custom';

  const [hexDraft, setHexDraft] = useState(customColor);

  useEffect(() => {
    setHexDraft(customColor);
  }, [customColor]);

  const selectCustomColor = (color: string) => {
    void setValue('core.appearance.customAccentColor', color.toLowerCase());
    void setValue('core.appearance.accentColor', 'custom');
  };

  const handleHexChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.trim();
    const nextValue = rawValue.startsWith('#') ? rawValue : `#${rawValue}`;
    setHexDraft(rawValue);
    if (isHexColor(nextValue)) {
      selectCustomColor(nextValue);
    }
  };

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
          const color = colorName as PresetAccentColor;
          const isSelected = selectedColor === color;
          const label = t(`appearance.accentColor.options.${color}`);

          return (
            <button
              key={color}
              aria-label={label}
              aria-pressed={isSelected}
              className={swatchClassName}
              onClick={() => {
                void setValue('core.appearance.accentColor', color);
              }}
              style={{ backgroundColor: accent.color }}
              title={label}
              type="button"
            >
              {isSelected && (
                <Check size={16} style={{ color: accent.foreground }} />
              )}
            </button>
          );
        })}
        <button
          aria-label={t('appearance.accentColor.options.custom')}
          aria-pressed={isCustomSelected}
          className={swatchClassName}
          data-testid="custom-accent-swatch"
          onClick={() => selectCustomColor(customColor)}
          style={{
            background: isCustomSelected
              ? customColor
              : 'conic-gradient(#ff5f6d, #ffc371, #1db954, #47c6ba, #4f86ff, #9b7bff, #ff5f6d)',
          }}
          title={t('appearance.accentColor.options.custom')}
          type="button"
        >
          {isCustomSelected && (
            <Check
              size={16}
              style={{ color: foregroundForColor(customColor) }}
            />
          )}
        </button>
        <span className="text-foreground/70 text-sm">
          {t(`appearance.accentColor.options.${selectedColor}`)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label
          className="border-border bg-background hover:bg-foreground/5 focus-within:ring-ring relative flex h-9 cursor-pointer items-center gap-2 rounded-md border-2 px-3 text-sm focus-within:ring-2"
          title={t('appearance.accentColor.custom.picker')}
        >
          <Pipette size={16} />
          <span
            className="border-border size-4 rounded-sm border"
            style={{ backgroundColor: customColor }}
          />
          <input
            aria-label={t('appearance.accentColor.custom.picker')}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => selectCustomColor(event.target.value)}
            type="color"
            value={customColor}
          />
        </label>
        <input
          aria-invalid={
            !isHexColor(hexDraft.startsWith('#') ? hexDraft : `#${hexDraft}`)
          }
          aria-label={t('appearance.accentColor.custom.hex')}
          className="border-border bg-background text-foreground focus-visible:ring-ring h-9 w-28 rounded-md border-2 px-2 font-mono text-sm uppercase focus-visible:ring-2 focus-visible:outline-none"
          maxLength={7}
          onChange={handleHexChange}
          spellCheck={false}
          value={hexDraft}
        />
      </div>
    </div>
  );
};
