import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional element rendered inside the input on the left (icon, prefix). */
  leadingAddon?: React.ReactNode;
  /** Optional element rendered inside the input on the right (icon, action). */
  trailingAddon?: React.ReactNode;
  /** Error state; turns the border red and is announced to screen readers. */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', leadingAddon, trailingAddon, invalid, ...props }, ref) => {
    const baseInput = (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          invalid && 'border-destructive focus-visible:ring-destructive',
          leadingAddon ? 'pl-9' : null,
          trailingAddon ? 'pr-9' : null,
          className,
        )}
        {...props}
      />
    );

    if (!leadingAddon && !trailingAddon) {
      return baseInput;
    }

    return (
      <div className="relative">
        {leadingAddon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted-foreground">
            {leadingAddon}
          </span>
        ) : null}
        {baseInput}
        {trailingAddon ? (
          <span className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground">
            {trailingAddon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
