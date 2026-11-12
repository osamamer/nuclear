import { Button as HeadlessButton } from '@headlessui/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../../utils';

const buttonVariants = cva(
  'data-selected:bg-primary/10 data-selected:text-primary inline-flex cursor-pointer items-center rounded-md whitespace-nowrap transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'surface-background border-border hover:bg-primary/10 border-(length:--border-width)',
        secondary:
          'surface-background border-border hover:bg-primary/10 border-(length:--border-width)',
        tertiary:
          'surface-muted border-border hover:bg-primary/10 border-(length:--border-width)',
        noShadow:
          'surface-background border-border hover:bg-primary/10 border-(length:--border-width)',
        text: 'text-foreground hover:bg-primary/10',
        ghost: 'hover:bg-primary/10 border border-current',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        xs: 'h-8 px-2 text-sm',
        lg: 'h-11 px-8',
        icon: 'size-10 justify-center',
        'icon-sm': 'size-8 justify-center',
        flexible: 'h-auto',
      },
      intent: {
        danger: 'border-accent-red/40 text-accent-red hover:bg-accent-red/10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant, size, intent, className, children, type, ...rest },
  ref,
) {
  return (
    <HeadlessButton
      as="button"
      ref={ref}
      className={cn(buttonVariants({ variant, size, intent, className }))}
      type={type ?? 'button'}
      {...rest}
    >
      {children}
    </HeadlessButton>
  );
});
