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
import { X, RefreshCw, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
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
  ACCOUNT_ALREADY_ACTIVE: 'This account is already active. Please sign in normally.',
  ACCOUNT_SUSPENDED: 'This account has been suspended and cannot be reactivated. Please contact support.',
};

const ReactivationCard: React.FC<ReactivationCardProps> = ({ prefillEmail, onClose }) => {
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
    const timer = setTimeout(() => passwordRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape (unless suspended — user must explicitly dismiss)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

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
      await reactivate({ email: prefillEmail, password });
      // Reactivation succeeded — AuthContext has set the user.
      // Navigate directly to the role dashboard. Do NOT use resolveAuthDestination
      // because reactivation must not restart onboarding.
      // We read the user from the updated context after reactivate() resolves.
      // Since AuthContext.reactivate() is async and setUser is called inside it,
      // we get the role from the returned user by reading context after state settles.
      // Use a state-based approach: after reactivate() resolves, user will be set.
      // We read it in the next render via the useEffect below.
    } catch (err) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setErrorMessage(REACTIVATION_ERROR_MESSAGES[err.code] ?? err.message);
      } else {
        setErrorCode('UNKNOWN');
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // After reactivation succeeds, `user` in AuthContext is set.
  // Navigate to the role dashboard as soon as it becomes available.
  useEffect(() => {
    if (user && !isLoading) {
      navigate(getRoleDashboard(user.role as Role), { replace: true });
    }
  }, [user, isLoading, navigate]);

  const isSuspended = errorCode === 'ACCOUNT_SUSPENDED';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="reactivation-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(26,20,14,0.5)', backdropFilter: 'blur(6px)' }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="reactivation-title"
      >
        {/* Card */}
        <motion.div
          key="reactivation-card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <GlassPanel className="p-8 relative">
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close reactivation dialog"
              className="absolute top-5 right-5 p-1.5 rounded-lg text-ink/30 hover:text-ink hover:bg-ink/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + heading */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-signal/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-signal" />
              </div>
              <div>
                <h2
                  id="reactivation-title"
                  className="font-serif text-xl font-semibold text-ink leading-tight"
                >
                  Reactivate your account
                </h2>
                <p className="text-xs text-ink/40 mt-0.5">Your progress is still here — pick up right where you left off.</p>
              </div>
            </div>

            {/* Explainer */}
            <p className="text-sm text-ink/50 mb-6 leading-relaxed">
              Your account was deactivated, but your learning history is preserved.
              Enter your password to restore access.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {/* Email (read-only) */}
              <Input
                id="reactivate-email"
                label="Email"
                type="email"
                value={prefillEmail}
                readOnly
                disabled
                className="opacity-60"
              />

              {/* Password */}
              <Input
                ref={passwordRef}
                id="reactivate-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                error={
                  // Show password error inline only if NOT a suspended error
                  (!isSuspended && errorMessage && errorCode !== 'ACCOUNT_NOT_FOUND')
                    ? errorMessage
                    : undefined
                }
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-ink/40 hover:text-ink transition-colors duration-150 focus-visible:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Non-password errors (account-level) */}
              <AnimatePresence>
                {errorMessage && (isSuspended || errorCode === 'ACCOUNT_NOT_FOUND' || errorCode === 'ACCOUNT_ALREADY_ACTIVE') && (
                  <motion.div
                    key="account-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border ${
                      isSuspended
                        ? 'bg-ink/5 border-ink/15 text-ink'
                        : 'bg-signal/8 border-signal/20 text-signal'
                    }`}>
                      {isSuspended ? (
                        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs leading-relaxed">{errorMessage}</p>
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
                className="w-full mt-1"
              >
                Reactivate Account
              </Button>
            </form>
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReactivationCard;
