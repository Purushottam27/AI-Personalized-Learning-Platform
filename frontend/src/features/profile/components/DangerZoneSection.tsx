/**
 * DangerZoneSection.tsx
 *
 * Visually distinct section for high-impact account actions like deactivation.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { DeactivateAccountModal } from './DeactivateAccountModal';
import { deactivateAccount } from '../api/profile.api';
import { useAuth } from '../../auth/useAuth';
import { isApiError } from '../../../lib/axios';

export const DangerZoneSection: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const handleConfirmDeactivation = async () => {
    setIsDeactivating(true);
    setDeactivateError(null);

    try {
      await deactivateAccount();
      // Clear auth state and cookies
      await logout();
      setIsModalOpen(false);
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      if (isApiError(err)) {
        setDeactivateError(err.message);
      } else {
        setDeactivateError('Failed to deactivate account. Please try again.');
      }
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-error/30 bg-surface p-6 sm:p-8 shadow-xs">
      <div className="border-b border-error/20 pb-4 mb-6">
        <div className="flex items-center gap-2 text-error">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-xl font-display font-semibold">Danger Zone</h2>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Irreversible and high-impact account actions. Please proceed with caution.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-error/20 bg-error-soft/20">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Deactivate this account
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Revokes active sessions, disables access to your profile, and marks your account as deactivated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDeactivateError(null);
            setIsModalOpen(true);
          }}
          className={[
            'inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer',
            'border border-error/40 text-error bg-transparent hover:bg-error hover:text-white',
            'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error',
          ].join(' ')}
        >
          Deactivate Account
        </button>
      </div>

      {/* Confirmation Modal */}
      <DeactivateAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isDeactivating) setIsModalOpen(false);
        }}
        onConfirm={handleConfirmDeactivation}
        isDeactivating={isDeactivating}
        error={deactivateError}
      />
    </div>
  );
};

export default DangerZoneSection;
