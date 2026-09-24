import { useId, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';

export interface OtherInputProps {
  isVisible: boolean;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function OtherInput({
  isVisible,
  value,
  onChange,
  placeholder = 'Please specify...',
  disabled = false,
}: OtherInputProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const id = useId();

  // Focus the input when it becomes visible.
  useEffect(() => {
    if (isVisible && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            height: 0,
            opacity: 0,
            marginTop: 0,
          }}
          animate={{
            height: 'auto',
            opacity: 1,
            marginTop: 12,
          }}
          exit={{
            height: 0,
            opacity: 0,
            marginTop: 0,
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
          className="overflow-hidden"
        >
          <div className="relative">
            <label
              htmlFor={id}
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary"
            >
              Your answer
            </label>

            <input
              ref={inputRef}
              id={id}
              type="text"
              value={value}
              onChange={(e) =>
                onChange(e.target.value)
              }
              disabled={disabled}
              placeholder={placeholder}
              className={[
                'w-full rounded-xl border px-4 py-3',
                'bg-surface text-sm text-text-primary',
                'placeholder:text-text-tertiary',
                'outline-none',
                'transition-all duration-150',

                disabled
                  ? [
                      'cursor-not-allowed',
                      'border-border-muted',
                      'bg-surface-disabled',
                      'text-text-disabled',
                      'placeholder:text-text-disabled',
                    ].join(' ')
                  : [
                      'border-border',
                      'hover:border-text-tertiary',
                      'focus:border-focus',
                      'focus:ring-2 focus:ring-focus/20',
                      'focus:bg-surface-elevated',
                    ].join(' '),
              ].join(' ')}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}