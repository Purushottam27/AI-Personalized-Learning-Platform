/**
 * Input — branded text input with error and disabled states.
 * Supports all standard input attributes via props forwarding.
 */
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, rightElement, className = '', disabled, ...rest }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-widest text-text-secondary select-none"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          className={[
            'w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface',
            'border transition-colors  duration-150 outline-none',
            error
              ? 'border-error text-text-primary bg-error-soft/40 placeholder:text-text-tertiary focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/25'
              : 'border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25',
            disabled
              ? 'bg-surface-disabled text-text-disabled border-border-muted cursor-not-allowed'
              : 'hover:border-border',
            rightElement ? 'pr-12' : '',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-error  font-medium">
          {error}
        </p>
      )}
    </div>
  )
);
Input.displayName = 'Input';

export default Input;
