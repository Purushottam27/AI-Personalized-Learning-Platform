import { useId, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // Focus the input when it becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      // Small delay to allow the animation to start
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
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="relative">
            <label htmlFor={id} className="sr-only">
              {placeholder}
            </label>
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className={`
                w-full rounded-lg border border-ink/20 bg-paper p-3 text-sm text-ink outline-none transition-colors
                placeholder:text-ink/40
                focus:border-signal focus:ring-1 focus:ring-signal
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
