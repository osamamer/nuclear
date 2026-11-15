import { FC, ReactNode } from 'react';

import { SidebarCompactProvider } from './SidebarCompactContext';

type SidebarNavigationProps = {
  children: ReactNode;
  isCompact?: boolean;
};

export const SidebarNavigation: FC<SidebarNavigationProps> = ({
  children,
  isCompact = false,
}) => {
  return (
    <SidebarCompactProvider isCompact={isCompact}>
      <div
        data-testid="sidebar-navigation"
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </div>
    </SidebarCompactProvider>
  );
};
