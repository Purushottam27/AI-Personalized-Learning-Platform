/**
 * LearnerProfilePage.tsx
 *
 * Production-ready combined Profile & Settings page for Learners.
 * Includes Header, Account details, Learning profile, Appearance, Password,
 * and Danger Zone.
 */

import React from 'react';
import { useAuth } from '../../auth/useAuth';
import { ProfileHeader } from '../components/ProfileHeader';
import { AccountDetailsSection } from '../components/AccountDetailsSection';
import { LearnerProfileSection } from '../components/LearnerProfileSection';
import { AppearanceSection } from '../components/AppearanceSection';
import { PasswordSection } from '../components/PasswordSection';
import { DangerZoneSection } from '../components/DangerZoneSection';

export const LearnerProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
          Profile & Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your personal account details, learning preferences, appearance, and security.
        </p>
      </div>

      {/* Summary Profile Header */}
      <ProfileHeader user={user} />

      {/* Editable Account Details & Avatar */}
      <AccountDetailsSection />

      {/* Role-Specific Learner Profile */}
      <LearnerProfileSection />

      {/* Interface Theme / Appearance */}
      <AppearanceSection />

      {/* Security: Password Change */}
      <PasswordSection />

      {/* Danger Zone: Account Deactivation */}
      <DangerZoneSection />
    </div>
  );
};

export default LearnerProfilePage;
