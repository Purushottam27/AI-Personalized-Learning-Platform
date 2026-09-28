import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ThemeToggle from '../../../components/ui/ThemeToggle';
import UserMenu from '../../../components/navigation/UserMenu';

interface InstructorTopbarProps {
  onMenuClick: () => void;
}

const PAGE_CONTEXT: Record<string, { title: string; subtitle: string }> = {
  '/instructor/dashboard': { title: 'Dashboard', subtitle: 'Teaching workspace' },
  '/instructor/courses/create': { title: 'Create Course', subtitle: 'Teaching' },
  '/instructor/courses': { title: 'My Courses', subtitle: 'Teaching' },
  '/instructor/learners': { title: 'Learners', subtitle: 'Insights' },
  '/instructor/analytics': { title: 'Analytics', subtitle: 'Insights' },
  '/instructor/profile': { title: 'Profile & Settings', subtitle: 'Account' },
};

function getPageContext(pathname: string) {
  // Exact match first
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname];
  // Fallback: find the best prefix match (longest match wins)
  const keys = Object.keys(PAGE_CONTEXT).sort((a, b) => b.length - a.length);
  const match = keys.find((key) => pathname.startsWith(key));
  return match ? PAGE_CONTEXT[match] : { title: 'Instructor', subtitle: 'Teaching workspace' };
}

export const InstructorTopbar: React.FC<InstructorTopbarProps> = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const context = getPageContext(pathname);

  return (
    <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-border-muted">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-md"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile: show brand */}
          <span className="lg:hidden font-display text-lg font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-signal via-signal to-sage">
            LEARNOVA
          </span>

          {/* Desktop: contextual hierarchy */}
          <div className="hidden lg:flex flex-col justify-center leading-tight">
            <span className="text-base font-semibold text-text-primary">{context.title}</span>
            <span className="text-xs text-text-tertiary">{context.subtitle}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />

          <button
            aria-label="Notifications"
            title="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-signal ring-2 ring-surface" />
          </button>

          <div className="h-8 w-[1px] bg-border-muted mx-1 hidden sm:block" />

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
