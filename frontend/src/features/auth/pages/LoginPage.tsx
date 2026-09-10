/**
 * LoginPage — /login
 *
 * Visual: Paper / Ink / Signal design system.
 * - Left editorial panel: warm charcoal/ink surface, serif tagline, SVG learning-path illustration.
 * - Right form panel: cream/paper background, clean form, contextual error states.
 *
 * Collapse to single centered form on mobile.
 *
 * Account-state handling:
 * - ACCOUNT_DEACTIVATED → ReactivationCard dialog (handled by ReactivationCard itself)
 * - ACCOUNT_SUSPENDED  → locked state banner, no reactivation CTA
 * - Field errors       → inline beneath the relevant input
 *
 * Post-login navigation:
 * - resolveAuthDestination checks onboarding state and routes accordingly
 * - Post-reactivation navigation is handled entirely by ReactivationCard
 *   (navigates directly to role dashboard, bypassing resolveAuthDestination)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../useAuth';
import { isApiError } from '../../../lib/axios';
import { getRoleDashboard } from '../utils/getRoleDashboard';
import { resolveAuthDestination } from '../utils/resolveAuthDestination';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import ReactivationCard from '../components/ReactivationCard';
import type { Role } from '../api/auth.api';

// ─── Error messages (mapped from backend auth.service.js error codes) ─────────

const FIELD_ERROR_MESSAGES: Record<string, { field: 'email' | 'password' | 'general'; text: string }> = {
  USER_NOT_FOUND:    { field: 'email',    text: 'No account exists with this email address.' },
  INCORRECT_PASSWORD:{ field: 'password', text: 'Incorrect password. Please try again.' },
  VALIDATION_ERROR:  { field: 'general',  text: 'Please check your input and try again.' },
  TOKEN_NOT_FOUND:   { field: 'general',  text: 'An authentication error occurred. Please try again.' },
};

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

// ─── Learning-path SVG illustration ────────────────────────────────────────────

const LearningPathIllustration: React.FC = () => (
  <svg
    viewBox="0 0 280 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-[280px] opacity-60"
    aria-hidden="true"
  >
    {/* Path line */}
    <motion.path
      d="M 40 180 C 80 180, 80 140, 120 140 C 160 140, 160 100, 200 80 C 230 65, 240 50, 240 40"
      stroke="rgba(240,232,220,0.35)"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.4 }}
    />
    {/* Branch path */}
    <motion.path
      d="M 200 80 C 220 90, 245 110, 240 130"
      stroke="rgba(192,99,63,0.4)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeDasharray="4 4"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.2, ease: 'easeInOut', delay: 2 }}
    />

    {/* Node: Start */}
    <motion.circle cx="40" cy="180" r="5" fill="rgba(240,232,220,0.5)"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} />
    <motion.text x="50" y="184" fill="rgba(240,232,220,0.4)" fontSize="9" fontFamily="serif"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
      Start
    </motion.text>

    {/* Node: Assess */}
    <motion.circle cx="120" cy="140" r="5" fill="rgba(192,99,63,0.7)"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 }} />
    <motion.text x="130" y="144" fill="rgba(240,232,220,0.4)" fontSize="9" fontFamily="serif"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
      Assess
    </motion.text>

    {/* Node: Adapt */}
    <motion.circle cx="200" cy="80" r="6" fill="rgba(192,99,63,0.9)"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8 }} />
    <motion.text x="210" y="84" fill="rgba(240,232,220,0.4)" fontSize="9" fontFamily="serif"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }}>
      Adapt
    </motion.text>

    {/* Node: Mastery */}
    <motion.circle cx="240" cy="40" r="5" fill="rgba(240,232,220,0.5)"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.4 }} />
    <motion.text x="248" y="44" fill="rgba(240,232,220,0.35)" fontSize="9" fontFamily="serif"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
      Master
    </motion.text>

    {/* Decorative small dots along path */}
    {[
      { cx: 80, cy: 160, delay: 0.7 },
      { cx: 160, cy: 110, delay: 1.4 },
    ].map((dot, i) => (
      <motion.circle
        key={i}
        cx={dot.cx}
        cy={dot.cy}
        r="2.5"
        fill="rgba(240,232,220,0.2)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: dot.delay }}
      />
    ))}
  </svg>
);

// ─── Left editorial panel ──────────────────────────────────────────────────────

const LeftPanel: React.FC = () => (
  <div className="hidden lg:flex flex-col justify-between h-full p-12 rounded-2xl relative overflow-hidden"
    style={{ background: 'linear-gradient(160deg, #1a1408 0%, #221c10 60%, #2a1f0e 100%)' }}
  >
    {/* Subtle grain texture */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
        backgroundSize: '200px 200px',
      }}
    />

    {/* Wordmark */}
    <div>
      <span className="font-serif text-2xl font-semibold tracking-tight" style={{ color: 'rgba(240,232,220,0.9)' }}>
        Adaptive
      </span>
      <span className="font-serif text-2xl font-light ml-1" style={{ color: 'rgba(240,232,220,0.35)' }}>
        Learning
      </span>
    </div>

    {/* Central illustration + tagline */}
    <div className="space-y-8">
      <LearningPathIllustration />
      <div className="space-y-4">
        <p className="font-serif text-3xl font-semibold leading-snug max-w-xs"
          style={{ color: 'rgba(240,232,220,0.9)' }}>
          Your learning path,{' '}
          <em className="font-light" style={{ color: 'rgba(240,232,220,0.45)' }}>
            shaped by evidence.
          </em>
        </p>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(240,232,220,0.4)' }}>
          Every session adapts to your strengths, gaps, and goals — so you always
          move forward with confidence.
        </p>
      </div>
    </div>

    {/* Bottom quote */}
    <div className="border-t pt-6" style={{ borderColor: 'rgba(240,232,220,0.08)' }}>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,232,220,0.25)' }}>
        &ldquo;The measure of intelligence is the ability to change.&rdquo;
        <br />
        <span className="mt-1 block" style={{ color: 'rgba(240,232,220,0.15)' }}>— Albert Einstein</span>
      </p>
    </div>
  </div>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { login, accountError, clearAccountError, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // Read signup-success state from navigation (set by SignupPage)
  const signupSuccess = (location.state as { signupSuccess?: boolean; email?: string } | null)?.signupSuccess;
  const signupEmail = (location.state as { signupSuccess?: boolean; email?: string } | null)?.email;

  // Pre-fill email from signup redirect
  useEffect(() => {
    if (signupEmail) {
      setEmail(signupEmail);
    }
  }, [signupEmail]);

  // Redirect if already authenticated (e.g. visiting /login while logged in)
  // Note: post-reactivation navigation is handled by ReactivationCard, NOT here.
  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && user && !accountError) {
      setIsResolving(true);
      const from = (location.state as { from?: Location } | null)?.from?.pathname;
      resolveAuthDestination(user.role, from).then((destination) => {
        if (!cancelled) navigate(destination, { replace: true });
      }).catch(() => {
        if (!cancelled) navigate(getRoleDashboard(user.role as Role), { replace: true });
      });
    }
    return () => { cancelled = true; };
  }, [isAuthenticated, user, accountError, navigate, location.state]);

  // Focus email on mount (unless email is pre-filled from signup, focus password instead)
  useEffect(() => {
    if (signupEmail) {
      // Let the user jump straight to password
    } else {
      emailRef.current?.focus();
    }
  }, [signupEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Navigation handled by the useEffect above (resolveAuthDestination)
    } catch (err) {
      if (isApiError(err)) {
        const mapping = FIELD_ERROR_MESSAGES[err.code];
        if (mapping) {
          setFieldErrors({ [mapping.field]: mapping.text });
        } else {
          setFieldErrors({ general: err.message });
        }
      } else {
        setFieldErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuspended = accountError?.code === 'ACCOUNT_SUSPENDED';
  const isDeactivated = accountError?.code === 'ACCOUNT_DEACTIVATED';

  return (
    <>
      <div className="min-h-screen bg-paper flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl"
        >
          {/* Outer grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl shadow-ink/8">
            <LeftPanel />

            {/* Form panel */}
            <div className="bg-paper/95 backdrop-blur-sm p-8 md:p-10 flex flex-col justify-center min-h-[580px] border border-ink/5 rounded-2xl lg:rounded-l-none">

              {/* Mobile wordmark */}
              <div className="lg:hidden mb-8">
                <Link to="/">
                  <span className="font-serif text-2xl font-semibold tracking-tight text-ink">Adaptive</span>
                  <span className="font-serif text-2xl font-light text-ink/40 ml-1">Learning</span>
                </Link>
              </div>

              <div className="mb-8">
                <h1 className="font-serif text-2xl font-semibold text-ink mb-1.5">Welcome back</h1>
                <p className="text-sm text-ink/50">Sign in to continue your learning journey.</p>
              </div>

              {/* Signup success banner */}
              <AnimatePresence>
                {signupSuccess && (
                  <motion.div
                    key="signup-success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sage/10 border border-sage/20">
                      <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Account created successfully</p>
                        <p className="text-xs text-ink/50 mt-0.5">Please sign in to continue to onboarding.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suspended banner */}
              <AnimatePresence>
                {isSuspended && (
                  <motion.div
                    key="suspended"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-ink/5 border border-ink/10">
                      <Lock className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Account suspended</p>
                        <p className="text-xs text-ink/50 mt-0.5 leading-relaxed">
                          This account has been suspended. Please contact support if you
                          believe this is an error.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General error banner */}
              <AnimatePresence>
                {fieldErrors.general && (
                  <motion.div
                    key="general-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-signal/8 border border-signal/20">
                      <AlertTriangle className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-signal">{fieldErrors.general}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <Input
                  ref={emailRef}
                  id="login-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  error={fieldErrors.email}
                  autoComplete="email"
                  disabled={isSubmitting}
                />

                <Input
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  error={fieldErrors.password}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  rightElement={
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-ink/40 hover:text-ink transition-colors duration-150 focus-visible:outline-none"
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSubmitting || isResolving}
                  className="w-full mt-1"
                  id="login-submit"
                >
                  {isResolving ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="text-sm text-ink/40 text-center mt-7">
                Don&apos;t have an account?{' '}
                <Link
                  to="/signup"
                  className="text-ink font-semibold underline underline-offset-2 hover:text-signal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reactivation dialog — rendered outside the grid, at root */}
      {isDeactivated && (
        <ReactivationCard
          prefillEmail={accountError?.email ?? email}
          onClose={clearAccountError}
        />
      )}
    </>
  );
};

export default LoginPage;
