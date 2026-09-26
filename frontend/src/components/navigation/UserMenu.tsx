import React, { useState, useRef, useEffect } from 'react';
import { LogOut, UserRoundCog, ChevronDown } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
  };

  const getInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const roleLabel = user?.role === 'LEARNER' ? 'Learner' : 
                    user?.role === 'INSTRUCTOR' ? 'Instructor' : 
                    user?.role === 'ADMIN' ? 'Admin' : 'User';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full hover:bg-surface-elevated p-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-paper font-semibold text-sm">
          {user?.avatar ? (
             <img src={user.avatar} alt={user?.name || 'User'} className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitial(user?.name)
          )}
        </div>
        <div className="hidden md:flex items-center gap-1">
          <span className="text-sm font-medium text-text-primary max-w-[120px] truncate">
            {user?.name || 'User'}
          </span>
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-surface-elevated shadow-lg py-1 z-50">
          <div className="px-4 py-3 border-b border-border-muted">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-signal">
              {roleLabel}
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/learner/profile');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:bg-surface focus-visible:outline-none"
            >
              <UserRoundCog className="h-4 w-4" />
              Profile & Settings
            </button>
          </div>
          <div className="py-1 border-t border-border-muted">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface hover:text-error focus-visible:bg-surface focus-visible:outline-none focus-visible:text-error"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
