/**
 * AppearanceSection.tsx
 *
 * Theme and display preferences section using existing ThemeProvider and ThemeToggle.
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../app/ThemeProvider';
import ThemeToggle from '../../../components/ui/ThemeToggle';

export const AppearanceSection: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
      <div className="border-b border-border-muted pb-4 mb-6">
        <h2 className="text-xl font-display font-semibold text-text-primary">
          Appearance
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Customize how the learning platform looks on your device.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-elevated">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-signal">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Interface Theme
            </h3>
            <p className="text-xs text-text-tertiary">
              Currently using <span className="font-semibold text-text-primary capitalize">{theme}</span> mode. Saved in your local browser preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={theme === 'dark' ? toggleTheme : undefined}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-signal text-paper border-signal shadow-xs'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={theme === 'light' ? toggleTheme : undefined}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-signal text-paper border-signal shadow-xs'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Dark
          </button>
          <div className="ml-2 pl-2 border-l border-border-muted">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSection;
