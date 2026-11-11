import { cva } from 'class-variance-authority';

export const queueItemVariants = cva(
  'group relative flex items-center gap-3 overflow-hidden rounded-lg border border-transparent bg-transparent transition-colors',
  {
    variants: {
      status: {
        idle: '',
        loading: 'opacity-70',
        error: '',
        success: '',
      },
      isCurrent: {
        true: 'bg-primary/10',
        false: 'hover:bg-muted/70',
      },
      isCollapsed: {
        true: 'h-9 w-9 justify-center p-0',
        false: 'h-14 w-full px-2 py-1.5',
      },
    },
    defaultVariants: {
      status: 'idle',
      isCurrent: false,
      isCollapsed: false,
    },
  },
);
