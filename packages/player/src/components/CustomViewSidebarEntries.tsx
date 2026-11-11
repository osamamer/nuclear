import { icons, PanelLeft } from 'lucide-react';
import { FC } from 'react';

import { SidebarNavigationItem } from '@nuclearplayer/ui';

import { customViewPath } from '../services/viewsHost';
import { customViewKey, useCustomViewsStore } from '../stores/customViewsStore';
import { useLayoutStore } from '../stores/layoutStore';
import { CustomViewErrorBoundary } from './CustomViewErrorBoundary';
import { customSidebarItemId } from './sidebarItemIds';

export const CustomViewSidebarEntries: FC = () => {
  const views = useCustomViewsStore((state) => state.views);
  const hiddenSidebarItems = useLayoutStore(
    (state) => state.hiddenSidebarItems,
  );

  return (
    <div data-testid="custom-view-sidebar-entries" className="contents">
      {Object.values(views)
        .filter(
          ({ pluginId, view }) =>
            !hiddenSidebarItems.includes(
              customSidebarItemId(pluginId, view.id),
            ),
        )
        .map(({ pluginId, view }) => {
          const Icon = icons[view.icon as keyof typeof icons] ?? PanelLeft;
          return (
            <CustomViewErrorBoundary
              key={customViewKey(pluginId, view.id)}
              pluginId={pluginId}
              viewId={view.id}
            >
              <SidebarNavigationItem
                to={customViewPath(pluginId, view.id)}
                icon={<Icon />}
                label={view.title}
              />
            </CustomViewErrorBoundary>
          );
        })}
    </div>
  );
};
