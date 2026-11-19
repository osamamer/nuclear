import { FC, ReactNode } from 'react';

import { ScrollableArea } from '../ScrollableArea/ScrollableArea';
import { SettingsNavigationSection } from './SettingsPanel';
import { SettingsPanelNavigationSection } from './SettingsPanelNavigationSection';

type SettingsPanelNavigationProps = {
  sections: SettingsNavigationSection[];
  footer?: ReactNode;
};

export const SettingsPanelNavigation: FC<SettingsPanelNavigationProps> = ({
  sections,
  footer,
}) => (
  <nav className="border-border/70 bg-card/35 flex w-40 shrink-0 flex-col border-r sm:w-56">
    <ScrollableArea viewportClassName="gap-4 p-4">
      {sections.map((section) => (
        <SettingsPanelNavigationSection key={section.id} section={section} />
      ))}
      {footer && <div className="mt-auto">{footer}</div>}
    </ScrollableArea>
  </nav>
);
