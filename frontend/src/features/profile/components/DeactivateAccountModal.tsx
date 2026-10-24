/**
 * DeactivateAccountModal.tsx
 *
 * Confirmation modal for deactivating the account. Requires user to type
 * "DEACTIVATE" to confirm and prevent accidental deactivation.
 */

import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

interface DeactivateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeactivating: boolean;
  error?: string | null;
}

export const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeactivating,
  error,
}) => {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim() === 'DEACTIVATE';

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeactivating) return;
    await onConfirm();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-error/30 bg-surface p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeactivating}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary rounded-lg p-1 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="h-12 w-12 rounded-xl bg-error-soft text-error flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3
              id="deactivate-modal-title"
              className="text-lg sm:text-xl font-display font-semibold text-text-primary"
            >
              Deactivate Account
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              Please review the consequences of this action carefully.
            </p>
          </div>
        </div>

        {/* Warning Details */}
        <div className="space-y-3 text-xs text-text-secondary rounded-xl bg-error-soft/30 border border-error/20 p-4 mb-5">
          <p className="font-semibold text-error">
            When you deactivate your account:
          </p>
          <ul className="list-disc list-inside space-y-1 text-text-secondary">
            <li>You will be immediately logged out across all devices.</li>
            <li>All active sessions and refresh tokens will be revoked.</li>
            <li>You will lose access to your courses and learning progress.</li>
            <li>Your account can only be restored via account reactivation.</li>
          </ul>
        </div>

        {/* Form Confirmation */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label
              htmlFor="confirm-deactivate-input"
              className="block text-xs font-semibold text-text-secondary mb-1.5"
            >
              Type <span className="font-mono font-bold text-error">DEACTIVATE</span> to confirm:
            </label>
            <input
              id="confirm-deactivate-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DEACTIVATE"
              disabled={isDeactivating}
              autoComplete="off"
              className="w-full px-4 py-2.5 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary placeholder:text-text-disabled focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/25 outline-none font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-error font-medium" role="alert">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-border-muted">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isDeactivating}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeactivating}
              className={[
                'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold select-none',
                'bg-error text-white hover:bg-error/90 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-error',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100 transition-all duration-200 cursor-pointer',
              ].join(' ')}
            >
              {isDeactivating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeactivating ? 'Deactivating...' : 'I understand, deactivate my account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivateAccountModal;
