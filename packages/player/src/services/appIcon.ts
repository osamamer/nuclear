import { getSetting, useSettingsStore } from '../stores/settingsStore';
import { resolveAccent } from './accentColor';
import { Logger } from './logger';
import { commands } from './tauri/bindings';

const ICON_SIZE = 512;
const TREFOIL_PATH =
  'M336.19 484.15 L253.23 471.01 A262 262 0 0 1 347.12 308.39 L399.98 373.67 A178 178 0 0 0 336.19 484.15 Z M624.02 373.67 L676.88 308.39 A262 262 0 0 1 770.77 471.01 L687.81 484.15 A178 178 0 0 0 624.02 373.67 Z M575.79 678.18 L605.89 756.60 A262 262 0 0 1 418.11 756.60 L448.21 678.18 A178 178 0 0 0 575.79 678.18 Z';

const mixWithWhite = (hexColor: string, amount: number): string => {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hexColor.slice(offset, offset + 2), 16);
    const mixed = Math.round(channel + (255 - channel) * amount);
    return mixed.toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
};

export const buildAppIconSvg = (accentColor: string): string => {
  const highlight = mixWithWhite(accentColor, 0.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#18211D"/>
      <stop offset="1" stop-color="#0C110F"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${highlight}"/>
      <stop offset="1" stop-color="${accentColor}"/>
    </linearGradient>
  </defs>
  <rect x="100" y="100" width="824" height="824" rx="200" fill="url(#bg)"/>
  <rect x="102" y="102" width="820" height="820" rx="198" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="4"/>
  <g fill="url(#accent)">
    <path d="${TREFOIL_PATH}" stroke="url(#accent)" stroke-width="84" stroke-linejoin="round"/>
    <circle cx="512" cy="512" r="66"/>
  </g>
</svg>`;
};

const renderSvgToPng = (svg: string): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      context.drawImage(image, 0, 0, ICON_SIZE, ICON_SIZE);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to encode icon PNG'));
          return;
        }
        void blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)), reject);
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('Failed to load icon SVG'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

let lastAppliedColor: string | undefined;

const currentAccentColor = (): string =>
  resolveAccent(
    getSetting('core.appearance.accentColor') as string | undefined,
    getSetting('core.appearance.customAccentColor') as string | undefined,
  ).color;

const syncAppIcon = async (): Promise<void> => {
  const accentColor = currentAccentColor();
  if (accentColor === lastAppliedColor) {
    return;
  }
  lastAppliedColor = accentColor;
  try {
    const png = await renderSvgToPng(buildAppIconSvg(accentColor));
    const result = await commands.setAppIcon(Array.from(png));
    if (result.status === 'error') {
      Logger.app.warn(`Failed to update app icon: ${result.error}`);
    }
  } catch (error) {
    Logger.app.warn(`Failed to update app icon: ${String(error)}`);
  }
};

export const initAppIconSync = (): void => {
  void syncAppIcon();
  useSettingsStore.subscribe(() => {
    void syncAppIcon();
  });
};
