export const ACCENT_COLORS = {
  blue: { color: '#4f86ff', foreground: '#101625' },
  violet: { color: '#9b7bff', foreground: '#171025' },
  teal: { color: '#47c6ba', foreground: '#0d211f' },
  pink: { color: '#f276aa', foreground: '#25101a' },
  orange: { color: '#ffa45e', foreground: '#26170c' },
  green: { color: '#74c98a', foreground: '#102116' },
  vividGreen: { color: '#1db954', foreground: '#06140b' },
} as const;

export type PresetAccentColor = keyof typeof ACCENT_COLORS;
export type AccentColor = PresetAccentColor | 'custom';

export const DEFAULT_CUSTOM_ACCENT_COLOR = '#1db954';

const ACCENT_TOKENS = [
  'green',
  'yellow',
  'purple',
  'blue',
  'orange',
  'cyan',
  'red',
] as const;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const isPresetAccentColor = (
  value: string,
): value is PresetAccentColor => value in ACCENT_COLORS;

export const isAccentColor = (value: string): value is AccentColor =>
  value === 'custom' || isPresetAccentColor(value);

export const isHexColor = (value: string): boolean =>
  HEX_COLOR_PATTERN.test(value);

const relativeLuminance = (hexColor: string): number => {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const [red, green, blue] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const foregroundForColor = (hexColor: string): string =>
  relativeLuminance(hexColor) > 0.179 ? '#0b0b0f' : '#ffffff';

export const resolveAccent = (
  accentColor: string | undefined,
  customColor: string | undefined,
): { color: string; foreground: string } => {
  if (accentColor === 'custom') {
    const color =
      customColor && isHexColor(customColor)
        ? customColor.toLowerCase()
        : DEFAULT_CUSTOM_ACCENT_COLOR;
    return { color, foreground: foregroundForColor(color) };
  }
  const preset =
    accentColor && isPresetAccentColor(accentColor) ? accentColor : 'blue';
  return ACCENT_COLORS[preset];
};

export const applyAccentColor = (
  accentColor: string | undefined,
  customColor?: string,
): void => {
  const accent = resolveAccent(accentColor, customColor);
  const root = document.documentElement;

  root.style.setProperty('--accent-color', accent.color);
  root.style.setProperty('--accent-foreground', accent.foreground);
  root.style.setProperty('--primary', accent.color);
  root.style.setProperty('--primary-foreground', accent.foreground);
  root.style.setProperty('--primary-gradient', 'none');
  root.style.setProperty('--seekbar', accent.color);
  root.style.setProperty('--seekbar-foreground', accent.foreground);
  root.style.setProperty('--seekbar-gradient', 'none');

  for (const token of ACCENT_TOKENS) {
    root.style.setProperty(`--accent-${token}`, accent.color);
    root.style.setProperty(`--accent-${token}-foreground`, accent.foreground);
    root.style.setProperty(`--accent-${token}-gradient`, 'none');
  }
};
