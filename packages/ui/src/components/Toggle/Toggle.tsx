import { Switch as HeadlessSwitch } from '@headlessui/react';
import { ComponentPropsWithoutRef, forwardRef, ReactNode } from 'react';

import { cn } from '../../utils';

type ToggleProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'onChange' | 'value' | 'role' | 'aria-checked'
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  thumbIcon?: ReactNode;
  checkedThumbIcon?: ReactNode;
  name?: string;
  value?: string;
  form?: string;
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked,
      defaultChecked = false,
      onChange,
      className,
      disabled,
      label,
      thumbIcon,
      checkedThumbIcon,
      name,
      value,
      form,
      ...rest
    },
    ref,
  ) => (
    <HeadlessSwitch
      as="button"
      type="button"
      ref={ref}
      checked={checked}
      defaultChecked={checked === undefined ? defaultChecked : undefined}
      onChange={(val: boolean) => onChange?.(val)}
      aria-label={label}
      disabled={disabled}
      name={name}
      value={value}
      form={form}
      className={cn(
        'border-border focus:ring-ring focus:ring-offset-muted relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-(length:--border-width) transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none',
        'surface-input data-checked:border-primary/60 hover:border-primary/40',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        'group',
        className,
      )}
      {...rest}
    >
      {({ checked }) => (
        <span
          className={cn(
            'border-border bg-muted [&>svg]:fill-muted group-data-checked:border-primary/60 group-data-checked:bg-primary/15 pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-(length:--border-width) ring-0 transition-all',
            // Positioning via data-attribute with group
            'translate-x-1 group-data-checked:translate-x-5',
          )}
        >
          {checked && checkedThumbIcon ? checkedThumbIcon : thumbIcon}
        </span>
      )}
    </HeadlessSwitch>
  ),
);
