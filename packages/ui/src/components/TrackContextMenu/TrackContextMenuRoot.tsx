import * as Menu from '@radix-ui/react-menu';
import { FC, ReactNode, useId, useMemo, useRef, useState } from 'react';

import { MenuPoint, TrackContextMenuContext } from './context';

type TrackContextMenuRootProps = {
  children: ReactNode;
};

export const TrackContextMenuRoot: FC<TrackContextMenuRootProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pointer, setPointer] = useState<MenuPoint>();
  const triggerRef = useRef<HTMLElement>(null);
  const triggerId = useId();
  const contentId = useId();
  const anchor = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () =>
          pointer
            ? new DOMRect(pointer.clientX, pointer.clientY)
            : (triggerRef.current?.getBoundingClientRect() ?? new DOMRect()),
      },
    }),
    [pointer],
  );

  return (
    <TrackContextMenuContext.Provider
      value={{
        isOpen,
        pointer,
        triggerRef,
        triggerId,
        contentId,
        open: (point) => {
          setPointer(point);
          setIsOpen(true);
        },
      }}
    >
      <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
        <Menu.Anchor virtualRef={anchor} />
        {children}
      </Menu.Root>
    </TrackContextMenuContext.Provider>
  );
};
