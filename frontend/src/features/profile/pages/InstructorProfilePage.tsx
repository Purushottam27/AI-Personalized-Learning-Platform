/**
 * InstructorProfilePage.tsx
 *
 * Production-ready combined Profile & Settings page for Instructors.
 * Includes Header, Account details, Instructor teaching profile, Appearance,
 * Password, and Danger Zone.
 */

import React from 'react';
import { useAuth } from '../../auth/useAuth';
import { ProfileHeader } from '../components/ProfileHeader';
import { AccountDetailsSection } from '../components/AccountDetailsSection';
import { InstructorProfileSection } from '../components/InstructorProfileSection';
import { AppearanceSection } from '../components/AppearanceSection';
import { PasswordSection } from '../components/PasswordSection';
import { DangerZoneSection } from '../components/DangerZoneSection';

export const InstructorProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
          Profile & Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your instructor identity, teaching credentials, appearance, and account security.
        </p>
      </div>

      {/* Summary Profile Header */}
      <ProfileHeader user={user} />

      {/* Editable Account Details & Avatar */}
      <AccountDetailsSection />

      {/* Role-Specific Instructor Profile */}
      <InstructorProfileSection />

      {/* Interface Theme / Appearance */}
      <AppearanceSection />

      {/* Security: Password Change */}
      <PasswordSection />

      {/* Danger Zone: Account Deactivation */}
      <DangerZoneSection />
    </div>
  );
};

export default InstructorProfilePage;
