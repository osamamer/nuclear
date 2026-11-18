import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FC, ReactNode, useMemo, useState } from 'react';

import { TrackContextMenuContext } from './context';

type TrackContextMenuRootProps = {
  children: ReactNode;
};

export const TrackContextMenuRoot: FC<TrackContextMenuRootProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <TrackContextMenuContext.Provider value={contextValue}>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        {children}
      </DropdownMenu.Root>
    </TrackContextMenuContext.Provider>
  );
};
