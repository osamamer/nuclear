export const ACCENT_COLORS = {
  blue: { color: '#4f86ff', foreground: '#101625' },
  violet: { color: '#9b7bff', foreground: '#171025' },
  teal: { color: '#47c6ba', foreground: '#0d211f' },
  pink: { color: '#f276aa', foreground: '#25101a' },
  orange: { color: '#ffa45e', foreground: '#26170c' },
  green: { color: '#74c98a', foreground: '#102116' },
} as const;

export type AccentColor = keyof typeof ACCENT_COLORS;

const ACCENT_TOKENS = [
  'green',
  'yellow',
  'purple',
  'blue',
  'orange',
  'cyan',
  'red',
] as const;

export const isAccentColor = (value: string): value is AccentColor =>
  value in ACCENT_COLORS;

export const applyAccentColor = (value: string | undefined): void => {
  const accentColor = value && isAccentColor(value) ? value : 'blue';
  const accent = ACCENT_COLORS[accentColor];
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
