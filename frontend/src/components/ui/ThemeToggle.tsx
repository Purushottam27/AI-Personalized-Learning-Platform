import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/ThemeProvider';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-full',
        'border border-border bg-surface',
        'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-focus/25 cursor-pointer',
      ].join(' ')}
    >
      {isDark ? (
        <Moon
          className="h-4 w-4"
          aria-hidden="true"
        />
      ) : (
        <Sun
          className="h-4 w-4"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

export default ThemeToggle;