import React from 'react';
import { Menu, Bell } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import UserMenu from './UserMenu';

interface LearnerTopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export const LearnerTopbar: React.FC<LearnerTopbarProps> = ({ onMenuClick, title }) => {
  return (
    <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-border-muted">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-md"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {title ? (
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          ) : (
            <span className="lg:hidden font-display text-xl font-semibold text-text-primary">
              LEARNOVA
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          
          <button
            aria-label="Notifications"
            title="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-signal ring-2 ring-surface"></span>
          </button>

          <div className="h-8 w-[1px] bg-border-muted mx-1 hidden sm:block"></div>
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
