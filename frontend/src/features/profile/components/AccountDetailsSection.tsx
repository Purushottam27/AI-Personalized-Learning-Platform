/**
 * AccountDetailsSection.tsx
 *
 * Section for updating Account Name and uploading an Avatar.
 * Email and Role are presented as read-only.
 */

import React, { useState, useRef } from 'react';
import { Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { updateAccountName, updateAvatar } from '../api/profile.api';
import { useAuth } from '../../auth/useAuth';
import { isApiError } from '../../../lib/axios';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const AccountDetailsSection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name state
  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Avatar state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }

    if (trimmed === user?.name) {
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
      return;
    }

    setIsSavingName(true);
    try {
      const updated = await updateAccountName(trimmed);
      updateUser({ name: updated.name });
      setName(updated.name);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setNameError(err.message);
      } else {
        setNameError('Failed to update name. Please try again.');
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(false);

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError('Please select a valid image file (JPEG, PNG, WebP, or GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('Image file is too large. Maximum size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await updateAvatar(file);
      updateUser({ avatar: result.avatar });
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Failed to upload avatar. Please try again.');
      }
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
      <div className="border-b border-border-muted pb-4 mb-6">
        <h2 className="text-xl font-display font-semibold text-text-primary">
          Account Details
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Manage your personal information, public profile photo, and display name.
        </p>
      </div>

      <div className="space-y-6">
        {/* Avatar Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2 select-none">
            Profile Photo
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-xl bg-surface-elevated border border-border overflow-hidden flex items-center justify-center text-signal font-bold text-xl shadow-xs">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </div>

            <div className="space-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="avatar-upload"
                disabled={isUploadingAvatar}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  loading={isUploadingAvatar}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </Button>
                {avatarSuccess && (
                  <span className="flex items-center text-xs font-medium text-sage">
                    <Check className="h-4 w-4 mr-1" />
                    Photo updated
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-tertiary">
                Supports JPG, PNG, WebP or GIF up to 5MB.
              </p>
            </div>
          </div>
          {avatarError && (
            <p className="mt-2 text-xs text-error flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {avatarError}
            </p>
          )}
        </div>

        {/* Name Form */}
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div className="max-w-md">
            <Input
              id="account-name"
              label="Full Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
                if (nameSuccess) setNameSuccess(false);
              }}
              error={nameError || undefined}
              placeholder="Your full name"
              disabled={isSavingName}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSavingName}
              disabled={isSavingName || !name.trim()}
            >
              {isSavingName ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Save Name'
              )}
            </Button>
            {nameSuccess && (
              <span className="flex items-center text-xs font-medium text-sage">
                <Check className="h-4 w-4 mr-1" />
                Name saved successfully
              </span>
            )}
          </div>
        </form>

        {/* Read-Only Account Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-muted max-w-2xl">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">
              Email Address
            </span>
            <div className="mt-1 px-3.5 py-2.5 rounded-lg bg-surface-disabled border border-border-muted text-sm text-text-secondary select-all">
              {user?.email || '—'}
            </div>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Email cannot be changed directly. Contact support if you need an email transfer.
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">
              Account Role
            </span>
            <div className="mt-1 px-3.5 py-2.5 rounded-lg bg-surface-disabled border border-border-muted text-sm font-medium text-text-secondary">
              {user?.role || '—'}
            </div>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Role permissions are assigned during registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsSection;
