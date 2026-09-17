/**
 * Button — branded button with hover, focus-visible, active, disabled, and
 * loading states. Supports primary, secondary, and ghost variants.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-signal text-paper hover:bg-signal-hover active:bg-signal-active focus-visible:ring-focus disabled:bg-surface-disabled disabled:text-text-disabled',

  secondary:
    'bg-transparent text-text-primary border border-border hover:bg-surface hover:border-border active:bg-surface-disabled focus-visible:ring-focus disabled:bg-surface-disabled disabled:text-text-disabled disabled:border-border-muted',

  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface active:bg-surface-disabled focus-visible:ring-focus disabled:text-text-disabled',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-4 text-base rounded-xl',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}) => (
  <button
    disabled={disabled || loading}
    className={[
      'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      'disabled:cursor-not-allowed select-none',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(' ')}
    aria-busy={loading}
    {...rest}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>
);

export default Button;
