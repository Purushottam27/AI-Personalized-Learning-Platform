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
        className="text-xs font-semibold uppercase tracking-widest text-muted select-none"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          className={[
            'w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface/60',
            'border transition-all duration-150 outline-none',
            error
              ? 'border-signal text-ink placeholder:text-signal/50 focus-visible:ring-2 focus-visible:ring-signal/30'
              : 'border-ink/15 text-ink placeholder:text-muted/50 focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/10',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-ink/25',
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
        <p id={`${id}-error`} role="alert" className="text-xs text-signal font-medium">
          {error}
        </p>
      )}
    </div>
  )
);
Input.displayName = 'Input';

export default Input;
