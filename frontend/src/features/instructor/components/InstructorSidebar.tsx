import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Users,
  BarChart3,
  UserRoundCog,
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  end?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, onClick, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus overflow-hidden ${
          isActive
            ? 'bg-signal-soft/50 text-signal'
            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-signal rounded-r-full" aria-hidden="true" />
          )}
          <Icon className={`h-5 w-5 ${isActive ? 'text-signal' : 'text-text-tertiary'}`} />
          {label}
        </>
      )}
    </NavLink>
  );
};

export const SidebarNav: React.FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  return (
    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
      <div className="space-y-1">
        <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">
          Teaching
        </h3>
        <SidebarItem to="/instructor/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onItemClick} end />
        <SidebarItem to="/instructor/courses" icon={BookOpen} label="My Courses" onClick={onItemClick} end />
        <SidebarItem to="/instructor/courses/create" icon={PlusCircle} label="Create Course" onClick={onItemClick} end />
      </div>

      <div className="space-y-1">
        <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">
          Insights
        </h3>
        <SidebarItem to="/instructor/learners" icon={Users} label="Learners" onClick={onItemClick} end />
        <SidebarItem to="/instructor/analytics" icon={BarChart3} label="Analytics" onClick={onItemClick} end />
      </div>

      <div className="space-y-1">
        <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">
          Account
        </h3>
        <SidebarItem to="/instructor/profile" icon={UserRoundCog} label="Profile & Settings" onClick={onItemClick} end />
      </div>
    </nav>
  );
};

export const InstructorSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-surface border-r border-border-muted z-30 overflow-hidden">
      {/* Subtle ambient effect in sidebar */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500" 
        style={{ opacity: 'var(--sidebar-ambient-opacity, 0)' }}
        aria-hidden="true"
      >
        <div className="absolute top-0 left-0 w-full h-48 bg-signal/5 blur-[60px]"></div>
      </div>
      
      <div className="relative h-16 flex items-center px-8 border-b border-border-muted z-10">
        <span className="font-display text-xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-signal via-signal to-sage">
          LEARNOVA
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden flex flex-col z-10">
        <SidebarNav />
      </div>
    </aside>
  );
};
