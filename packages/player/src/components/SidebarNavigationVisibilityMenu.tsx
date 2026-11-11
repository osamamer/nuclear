import { Eye, EyeOff, icons, PanelLeft, SettingsIcon } from 'lucide-react';
import { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Popover } from '@nuclearplayer/ui';

import { useCustomViewsStore } from '../stores/customViewsStore';
import { useLayoutStore } from '../stores/layoutStore';
import { customSidebarItemId, SIDEBAR_ITEM_IDS } from './sidebarItemIds';

type SidebarNavigationVisibilityMenuProps = {
  isCompact: boolean;
  builtInItems: {
    id: string;
    label: string;
    icon: ReactNode;
  }[];
};

export const SidebarNavigationVisibilityMenu: FC<
  SidebarNavigationVisibilityMenuProps
> = ({ isCompact, builtInItems }) => {
  const { t } = useTranslation('navigation');
  const { t: tPreferences } = useTranslation('preferences');
  const { hiddenSidebarItems, setSidebarItemVisible } = useLayoutStore();
  const views = useCustomViewsStore((state) => state.views);
  const customItems = Object.values(views).map(({ pluginId, view }) => {
    const Icon = icons[view.icon as keyof typeof icons] ?? PanelLeft;

    return {
      id: customSidebarItemId(pluginId, view.id),
      label: view.title,
      icon: <Icon />,
    };
  });
  const settingsItem = {
    id: SIDEBAR_ITEM_IDS.settings,
    label: tPreferences('title'),
    icon: <SettingsIcon />,
  };

  const renderItem = ({ id, label, icon }: (typeof builtInItems)[number]) => {
    const isVisible = !hiddenSidebarItems.includes(id);

    return (
      <Popover.Item
        key={id}
        icon={icon}
        aria-label={`${t(isVisible ? 'hideSidebarItem' : 'showSidebarItem')}: ${label}`}
        aria-pressed={isVisible}
        onClick={() => setSidebarItemVisible(id, !isVisible)}
      >
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="truncate">{label}</span>
          {isVisible ? (
            <Eye size={16} className="text-foreground/45 shrink-0" />
          ) : (
            <EyeOff size={16} className="text-foreground/45 shrink-0" />
          )}
        </span>
      </Popover.Item>
    );
  };

  const playlistItem = builtInItems.find(
    (item) => item.id === SIDEBAR_ITEM_IDS.playlists,
  );
  const mainItems = builtInItems.filter(
    (item) => item.id !== SIDEBAR_ITEM_IDS.playlists,
  );

  return (
    <Popover
      className="relative w-full"
      anchor="right"
      panelClassName="max-h-[70vh] min-w-64 overflow-y-auto p-1"
      trigger={
        <Button
          variant="text"
          size={isCompact ? 'icon-sm' : 'sm'}
          title={t('customizeSidebar')}
          aria-label={t('customizeSidebar')}
          className={`text-foreground/60 hover:bg-muted/70 hover:text-foreground w-full gap-2 ${
            isCompact ? 'justify-center px-0' : 'justify-start'
          }`}
        >
          <PanelLeft size={18} />
          {!isCompact && <span>{t('customizeSidebar')}</span>}
        </Button>
      }
    >
      <Popover.Menu className="min-w-64">
        <Popover.Section label={t('sidebarItems')}>
          {playlistItem && renderItem(playlistItem)}
          {mainItems.map(renderItem)}
        </Popover.Section>
        {customItems.length > 0 && (
          <Popover.Section label={t('pluginPages')}>
            {customItems.map(renderItem)}
          </Popover.Section>
        )}
        <Popover.Section label={t('app')}>
          {renderItem(settingsItem)}
        </Popover.Section>
      </Popover.Menu>
    </Popover>
  );
};
