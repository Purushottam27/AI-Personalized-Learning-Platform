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

  return (
    <label
      htmlFor={id}
      className={`
        relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sage/10 hover:border-ink/20'}
        ${
          selected
            ? 'border-signal bg-signal/5 ring-1 ring-signal/20'
            : 'border-ink/10 bg-paper'
        }
      `}
    >
      <input
        type={type === 'multiple' ? 'checkbox' : 'radio'}
        id={id}
        name={type === 'single' ? 'selection' : undefined}
        checked={selected}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      
      {/* Custom visual indicator */}
      <div
        className={`
          mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200
          ${
            selected
              ? 'border-signal bg-signal text-paper'
              : 'border-ink/30 bg-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-signal/50'
          }
          ${type === 'multiple' ? 'rounded-md' : 'rounded-full'}
        `}
        aria-hidden="true"
      >
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {type === 'multiple' ? (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="h-2 w-2 rounded-full bg-paper" />
            )}
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-sm font-medium ${selected ? 'text-signal' : 'text-ink'}`}>
          {label}
        </span>
        {description && (
          <span className="text-sm text-ink/60">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
