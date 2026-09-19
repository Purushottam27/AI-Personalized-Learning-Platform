import { useId } from 'react';
import { motion } from 'framer-motion';

export interface SelectionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onChange: () => void;
  type?: 'single' | 'multiple';
  disabled?: boolean;
}

export default function SelectionCard({
  label,
  description,
  selected,
  onChange,
  type = 'single',
  disabled = false,
}: SelectionCardProps) {
  const id = useId();
  const isMultiple = type === 'multiple';

  return (
    <label
      htmlFor={id}
      className={[
        'group relative flex items-start gap-4 rounded-xl border p-4 sm:p-5',
        'transition-all duration-150',
        'select-none',
        disabled
          ? 'cursor-not-allowed border-border-muted bg-surface-disabled'
          : selected
            ? 'cursor-pointer border-signal bg-signal-soft shadow-sm shadow-signal/5'
            : [
                'cursor-pointer border-border bg-surface',
                'hover:border-border hover:bg-surface-elevated',
                'hover:shadow-sm hover:shadow-ink/5',
              ].join(' '),
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus/25',
        'has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface',
      ].join(' ')}
    >
      <input
        type={isMultiple ? 'checkbox' : 'radio'}
        id={id}
        name={type === 'single' ? 'selection' : undefined}
        checked={selected}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />

      {/* Selection indicator */}
      <div
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center',
          'border transition-all duration-150',
          isMultiple ? 'rounded-md' : 'rounded-full',
          disabled
            ? 'border-border-muted bg-surface-disabled'
            : selected
              ? 'border-signal bg-signal text-paper'
              : [
                  'border-text-tertiary bg-transparent',
                  'group-hover:border-text-secondary',
                  'peer-focus-visible:border-focus',
                ].join(' '),
        ].join(' ')}
        aria-hidden="true"
      >
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 22,
            }}
          >
            {isMultiple ? (
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <div className="h-2 w-2 rounded-full bg-paper" />
            )}
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={[
            'block text-sm font-semibold leading-5',
            'transition-colors duration-150',
            disabled
              ? 'text-text-disabled'
              : selected
                ? 'text-signal'
                : 'text-text-primary',
          ].join(' ')}
        >
          {label}
        </span>

        {description && (
          <span
            className={[
              'mt-1 block text-sm leading-5',
              disabled ? 'text-text-disabled' : 'text-text-secondary',
            ].join(' ')}
          >
            {description}
          </span>
        )}
      </div>

      {/* Selected state marker */}
      {selected && !disabled && (
        <motion.div
          layoutId={`selection-marker-${type}`}
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-signal"
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 30,
          }}
          aria-hidden="true"
        />
      )}
    </label>
  );
}