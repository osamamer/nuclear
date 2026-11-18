import type { MouseEvent } from 'react';

export const TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE =
  'data-track-context-trigger';

export const openNearestTrackContextMenu = (event: MouseEvent<HTMLElement>) => {
  const trigger = event.currentTarget.querySelector<HTMLElement>(
    `[${TRACK_CONTEXT_MENU_TRIGGER_ATTRIBUTE}]`,
  );
  if (!trigger || trigger.contains(event.target as Node)) {
    return;
  }
  event.preventDefault();
  trigger.dispatchEvent(
    new window.MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
    }),
  );
};
