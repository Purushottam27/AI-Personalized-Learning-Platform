import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Sparkles,
  BarChart3,
  UserRoundCog,
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isActive
            ? 'bg-signal-soft text-signal'
            : 'text-text-secondary hover:bg-surface hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
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
          Learning
        </h3>
        <SidebarItem to="/learner/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onItemClick} />
        <SidebarItem to="/learner/courses" icon={BookOpen} label="My Courses" onClick={onItemClick} />
        <SidebarItem to="/learner/explore" icon={Compass} label="Explore" onClick={onItemClick} />
        <SidebarItem to="/learner/recommended" icon={Sparkles} label="Recommended" onClick={onItemClick} />
      </div>

      <div className="space-y-1">
        <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">
          Insights
        </h3>
        <SidebarItem to="/learner/analytics" icon={BarChart3} label="Analytics" onClick={onItemClick} />
      </div>

      <div className="space-y-1">
        <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">
          Account
        </h3>
        <SidebarItem to="/learner/profile" icon={UserRoundCog} label="Profile & Settings" onClick={onItemClick} />
      </div>
    </nav>
  );
};

export const LearnerSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-surface border-r border-border-muted z-30">
      <div className="h-16 flex items-center px-8 border-b border-border-muted">
        <span className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          LEARNOVA
        </span>
      </div>
      <SidebarNav />
    </aside>
  );
};
