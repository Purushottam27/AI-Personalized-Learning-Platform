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
    'bg-ink text-paper hover:bg-ink/85 active:bg-ink/95 focus-visible:ring-ink/30 disabled:bg-ink/40',
  secondary:
    'bg-transparent text-ink border border-ink/25 hover:bg-ink/5 hover:border-ink/40 active:bg-ink/10 focus-visible:ring-ink/20 disabled:opacity-40',
  ghost:
    'bg-transparent text-muted hover:text-ink hover:bg-ink/5 active:bg-ink/10 focus-visible:ring-ink/20 disabled:opacity-40',
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
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
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
