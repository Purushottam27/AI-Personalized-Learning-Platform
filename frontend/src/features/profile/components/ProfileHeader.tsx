/**
 * ProfileHeader.tsx
 *
 * Header displaying avatar, full name, role badge, account status, and email.
 */

import React from 'react';
import type { AuthUser } from '../../auth/api/auth.api';

interface ProfileHeaderProps {
  user: AuthUser | null;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : 'U');

  const roleLabel =
    user?.role === 'LEARNER'
      ? 'Learner'
      : user?.role === 'INSTRUCTOR'
      ? 'Instructor'
      : user?.role === 'ADMIN'
      ? 'Admin'
      : 'User';

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-signal text-paper font-bold text-3xl shadow-sm overflow-hidden border-2 border-border">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User'}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitial(user?.name)
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-text-primary truncate">
              {user?.name || 'User'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-signal-soft text-signal border border-signal/20">
              {roleLabel}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user?.status === 'ACTIVE'
                  ? 'bg-sage-soft text-sage border border-sage/20'
                  : 'bg-warning-soft text-warning border border-warning/20'
              }`}
            >
              {user?.status || 'ACTIVE'}
            </span>
          </div>

          <p className="mt-1 text-sm text-text-secondary truncate">{user?.email}</p>

          <p className="mt-3 text-xs text-text-tertiary">
            Personalize your experience, manage your learning profile, and control your account settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
