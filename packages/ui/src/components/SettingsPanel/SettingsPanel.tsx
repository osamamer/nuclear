import { ArrowLeft } from 'lucide-react';
import { FC, ReactNode } from 'react';

import { Button } from '../Button';
import { DialogRoot } from '../Dialog/DialogRoot';
import { DialogTitle } from '../Dialog/DialogTitle';
import { SettingsPanelContent } from './SettingsPanelContent';
import { SettingsPanelNavigation } from './SettingsPanelNavigation';

export type SettingsNavigationItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

export type SettingsNavigationSection = {
  id: string;
  label: string;
  items: SettingsNavigationItem[];
  activeItemId: string | null;
  onSelect: (itemId: string) => void;
};

type SettingsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  backLabel: string;
  sections: SettingsNavigationSection[];
  navigationFooter?: ReactNode;
  children: ReactNode;
};

export const SettingsPanel: FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  title,
  backLabel,
  sections,
  navigationFooter,
  children,
}) => (
  <DialogRoot
    isOpen={isOpen}
    onClose={onClose}
    showCloseButton={false}
    className="flex h-[min(46rem,calc(100dvh-2rem))] max-w-5xl flex-col overflow-hidden rounded-2xl p-0"
  >
    <header className="border-border/70 flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <Button
        type="button"
        variant="text"
        size="icon-sm"
        aria-label={backLabel}
        onClick={onClose}
      >
        <ArrowLeft size={18} />
      </Button>
      <DialogTitle>{title}</DialogTitle>
    </header>
    <div className="flex min-h-0 flex-1">
      <SettingsPanelNavigation sections={sections} footer={navigationFooter} />
      <SettingsPanelContent>{children}</SettingsPanelContent>
    </div>
  </DialogRoot>
);
