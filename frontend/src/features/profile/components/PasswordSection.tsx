/**
 * PasswordSection.tsx
 *
 * Security section for changing password:
 * - Current password
 * - New password (min 8 chars)
 * - Confirm new password
 * - Show/hide password toggles
 * - Validation & error reporting
 * - Input clearing on success
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Check, AlertCircle, Lock } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { changePassword } from '../api/profile.api';
import { isApiError } from '../../../lib/axios';

export const PasswordSection: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [isChanging, setIsChanging] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    const errors: {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!oldPassword) {
      errors.oldPassword = 'Current password is required.';
    } else if (oldPassword.length < 8) {
      errors.oldPassword = 'Current password must be at least 8 characters.';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsChanging(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setFormError(err.message);
      } else {
        setFormError('Failed to change password. Please check your current password.');
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
      <div className="border-b border-border-muted pb-4 mb-6">
        <h2 className="text-xl font-display font-semibold text-text-primary">
          Change Password
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Update your login password. We recommend choosing a strong, unique password of at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Current Password */}
        <Input
          id="profile-current-password"
          label="Current Password"
          type={showOld ? 'text' : 'password'}
          value={oldPassword}
          onChange={(e) => {
            setOldPassword(e.target.value);
            if (fieldErrors.oldPassword) setFieldErrors((prev) => ({ ...prev, oldPassword: undefined }));
          }}
          placeholder="••••••••"
          error={fieldErrors.oldPassword}
          disabled={isChanging}
          autoComplete="current-password"
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              aria-label={showOld ? 'Hide current password' : 'Show current password'}
            >
              {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        {/* New Password */}
        <Input
          id="profile-new-password"
          label="New Password"
          type={showNew ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
          }}
          placeholder="••••••••"
          error={fieldErrors.newPassword}
          disabled={isChanging}
          autoComplete="new-password"
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        {/* Confirm Password */}
        <Input
          id="profile-confirm-password"
          label="Confirm New Password"
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
          disabled={isChanging}
          autoComplete="new-password"
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        {/* General Form Error */}
        {formError && (
          <div className="rounded-xl border border-error/30 bg-error-soft/40 p-3 text-xs text-error flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-xl border border-sage/30 bg-sage-soft/40 p-3 text-xs text-sage flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>Your password has been changed successfully.</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isChanging}
            disabled={isChanging || !oldPassword || !newPassword || !confirmPassword}
          >
            <Lock className="h-4 w-4 mr-1.5" />
            {isChanging ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PasswordSection;
