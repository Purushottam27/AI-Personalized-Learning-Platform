/**
 * ReactivationCard — a focused dialog overlay that appears when a login
 * attempt returns ACCOUNT_DEACTIVATED.
 *
 * On success: reactivates account, sets user in AuthContext, then navigates
 * directly to the role-specific dashboard. Reactivation must not restart
 * onboarding — the user's profile already exists.
 *
 * On close: clears accountError in AuthContext.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

import GlassPanel from '../../../components/ui/GlassPanel';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { useAuth } from '../useAuth';
import { isApiError } from '../../../lib/axios';
import { getRoleDashboard } from '../utils/getRoleDashboard';
import type { Role } from '../api/auth.api';

interface ReactivationCardProps {
  prefillEmail: string;
  onClose: () => void;
}

// Error codes from reactivateService in auth.service.js
const REACTIVATION_ERROR_MESSAGES: Record<string, string> = {
  INCORRECT_PASSWORD: 'Incorrect password. Please try again.',
  ACCOUNT_NOT_FOUND: 'No account found for this email address.',
  ACCOUNT_ALREADY_ACTIVE:
    'This account is already active. Please sign in normally.',
  ACCOUNT_SUSPENDED:
    'This account has been suspended and cannot be reactivated. Please contact support.',
};

const ReactivationCard: React.FC<ReactivationCardProps> = ({
  prefillEmail,
  onClose,
}) => {
  const { reactivate, user } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus password on open
  useEffect(() => {
    const timer = setTimeout(
      () => passwordRef.current?.focus(),
      100,
    );

    return () => clearTimeout(timer);
  }, []);

  // Close on Escape (unless suspended — user must explicitly dismiss)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      setErrorCode('VALIDATION_ERROR');
      return;
    }

    setErrorMessage(null);
    setErrorCode(null);
    setIsLoading(true);

    try {
      await reactivate({
        email: prefillEmail,
        password,
      });

      // Reactivation succeeded — AuthContext has set the user.
      // Navigate directly to the role dashboard.
      // Do NOT use resolveAuthDestination because reactivation
      // must not restart onboarding.
    } catch (err) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setErrorMessage(
          REACTIVATION_ERROR_MESSAGES[err.code] ?? err.message,
        );
      } else {
        setErrorCode('UNKNOWN');
        setErrorMessage(
          'Something went wrong. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // After reactivation succeeds, `user` in AuthContext is set.
  // Navigate to the role dashboard as soon as it becomes available.
  useEffect(() => {
    if (user && !isLoading) {
      navigate(
        getRoleDashboard(user.role as Role),
        { replace: true },
      );
    }
  }, [user, isLoading, navigate]);

  const isSuspended =
    errorCode === 'ACCOUNT_SUSPENDED';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="reactivation-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={[
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-ink/50 p-4',
          'backdrop-blur-md',
        ].join(' ')}
        aria-modal="true"
        role="dialog"
        aria-labelledby="reactivation-title"
      >
        {/* Card */}
        <motion.div
          key="reactivation-card"
          initial={{
            opacity: 0,
            y: 24,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 16,
            scale: 0.97,
          }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full max-w-md"
        >
          <GlassPanel
            className={[
              'relative overflow-hidden',
              'p-6 sm:p-8',
            ].join(' ')}
          >
            {/* Ambient theme glow */}
            <div
              className={[
                'pointer-events-none absolute inset-x-0 top-0',
                'h-28',
                'bg-linear-to-r',
                'from-signal-soft/45',
                'via-transparent',
                'to-sage-soft/35',
              ].join(' ')}
              aria-hidden="true"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close reactivation dialog"
              className={[
                'absolute right-5 top-5 z-10',
                'rounded-lg p-1.5',
                'text-text-tertiary',
                'transition-colors duration-150',
                'hover:bg-surface-elevated',
                'hover:text-text-primary',
                'focus-visible:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-focus/25',
                'disabled:cursor-not-allowed',
                'disabled:text-text-disabled',
              ].join(' ')}
            >
              <X
                className="h-4 w-4"
                aria-hidden="true"
              />
            </button>

            {/* Icon + heading */}
            <div className="relative mb-5 flex items-center gap-3">
              <div
                className={[
                  'flex h-11 w-11 shrink-0',
                  'items-center justify-center',
                  'rounded-xl',
                  'border border-signal/15',
                  'bg-signal-soft',
                  'shadow-sm shadow-signal/10',
                ].join(' ')}
              >
                <RefreshCw
                  className="h-5 w-5 text-signal"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2
                  id="reactivation-title"
                  className={[
                    'font-display text-xl sm:text-2xl',
                    'font-semibold leading-tight tracking-tight',
                    'bg-linear-to-r',
                    'from-signal to-sage',
                    'bg-clip-text text-transparent',
                  ].join(' ')}
                >
                  Restore your account
                </h2>
              </div>
            </div>

            {/* Explainer */}
            <div className="relative">
              <p className="mb-3 text-sm leading-relaxed text-text-secondary">
                Your account is currently deactivated. Your
                learning progress and profile are still
                preserved.
              </p>

              <p className="mb-5 text-sm leading-relaxed text-text-secondary">
                Reactivating restores your access to your
                learning journey.
              </p>

              <div
                className="h-px bg-border-muted"
                aria-hidden="true"
              />
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="relative mt-5 flex flex-col gap-4"
            >
              {/* Email (read-only) */}
              <Input
                id="reactivate-email"
                label="Email"
                type="email"
                value={prefillEmail}
                readOnly
                disabled
              />

              {/* Password */}
              <Input
                ref={passwordRef}
                id="reactivate-password"
                label="Confirm your password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                error={
                  !isSuspended &&
                  errorMessage &&
                  errorCode !== 'ACCOUNT_NOT_FOUND'
                    ? errorMessage
                    : undefined
                }
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className={[
                      'cursor-pointer rounded-md',
                      'text-text-tertiary',
                      'transition-colors duration-150',
                      'hover:text-text-primary',
                      'focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-focus/25',
                      'focus-visible:ring-offset-2',
                      'focus-visible:ring-offset-surface',
                    ].join(' ')}
                  >
                    {showPassword ? (
                      <EyeOff
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                }
              />

              {/* Non-password errors */}
              <AnimatePresence>
                {errorMessage &&
                  (isSuspended ||
                    errorCode === 'ACCOUNT_NOT_FOUND' ||
                    errorCode === 'ACCOUNT_ALREADY_ACTIVE') && (
                    <motion.div
                      key="account-error"
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      className="overflow-hidden"
                    >
                      <div
                        className={[
                          'flex items-start gap-2.5',
                          'rounded-lg border px-3.5 py-3',
                          isSuspended
                            ? 'border-warning bg-warning-soft text-warning'
                            : 'border-error bg-error-soft text-error',
                        ].join(' ')}
                      >
                        {isSuspended ? (
                          <Lock
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}

                        <p className="text-xs leading-relaxed">
                          {errorMessage}
                        </p>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isLoading}
                disabled={isSuspended}
                className="mt-1 w-full cursor-pointer"
              >
                Restore Account Access →
              </Button>
            </form>
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReactivationCard;