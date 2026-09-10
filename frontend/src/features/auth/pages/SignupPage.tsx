/**
 * SignupPage — /signup
 *
 * Visual: Paper / Ink / Signal design system — editorial, warm, premium.
 * Matches the same product language as LoginPage and the landing page.
 *
 * Flow:
 *   Signup → account created → redirect to /login with a success message.
 *   Signup does NOT create an authenticated session. Login is responsible.
 *
 * Admin role is strictly excluded from public signup.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../useAuth';
import { isApiError } from '../../../lib/axios';
import { getRoleDashboard } from '../utils/getRoleDashboard';
import { resolveAuthDestination } from '../utils/resolveAuthDestination';
import GlassPanel from '../../../components/ui/GlassPanel';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { Role } from '../api/auth.api';

type SignupRole = 'LEARNER' | 'INSTRUCTOR';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  general?: string;
}

// ─── Role Card ────────────────────────────────────────────────────────────────

interface RoleCardProps {
  role: SignupRole;
  selected: boolean;
  onSelect: (role: SignupRole) => void;
}

const ROLE_META: Record<SignupRole, { label: string; description: string; icon: React.ReactNode }> = {
  LEARNER: {
    label: 'Learner',
    description: 'I want to learn and grow with a personalized path.',
    icon: <BookOpen className="w-5 h-5" />,
  },
  INSTRUCTOR: {
    label: 'Instructor',
    description: 'I want to teach, create courses, and guide learners.',
    icon: <GraduationCap className="w-5 h-5" />,
  },
};

const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onSelect }) => {
  const meta = ROLE_META[role];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(role)}
      className={[
        'flex items-start gap-3 p-4 rounded-xl border text-left w-full transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40',
        selected
          ? 'border-signal bg-signal/5 ring-1 ring-signal/20 text-ink'
          : 'border-ink/10 bg-white/40 text-ink hover:border-ink/20 hover:bg-white/60',
      ].join(' ')}
    >
      <div
        className={[
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200',
          selected ? 'bg-signal/15 text-signal' : 'bg-ink/5 text-ink/50',
        ].join(' ')}
      >
        {meta.icon}
      </div>
      <div>
        <p className={`font-semibold text-sm ${selected ? 'text-signal' : 'text-ink'}`}>{meta.label}</p>
        <p className={`text-xs leading-relaxed mt-0.5 ${selected ? 'text-ink/60' : 'text-ink/40'}`}>
          {meta.description}
        </p>
      </div>
    </button>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SignupPage: React.FC = () => {
  const { signup, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<SignupRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  // If already authenticated (e.g. back-navigation), redirect to the right place
  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && user) {
      setIsResolving(true);
      resolveAuthDestination(user.role).then((destination) => {
        if (!cancelled) navigate(destination, { replace: true });
      }).catch(() => {
        if (!cancelled) navigate(getRoleDashboard(user.role as Role), { replace: true });
      });
    }
    return () => { cancelled = true; };
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!role) errors.role = 'Please select a role to continue.';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, role: role! });
      // Signup succeeded — account created. Redirect to login with a success hint.
      navigate('/login', {
        replace: true,
        state: { signupSuccess: true, email: email.trim() },
      });
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'EMAIL_ALREADY_EXIST') {
          setFieldErrors({ email: 'An account with this email already exists. Try signing in instead.' });
        } else if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors({ general: 'Please check your input and try again.' });
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

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded">
            <span className="font-serif text-2xl font-semibold tracking-tight text-ink">Adaptive</span>
            <span className="font-serif text-2xl font-light text-ink/40 ml-1">Learning</span>
          </Link>
        </div>

        <GlassPanel className="p-8 md:p-10">
          <div className="mb-7">
            <h1 className="font-serif text-2xl font-semibold text-ink mb-1.5">Create your account</h1>
            <p className="text-sm text-ink/50">Start your personalized learning journey today.</p>
          </div>

          {/* General error */}
          <AnimatePresence>
            {fieldErrors.general && (
              <motion.div
                key="general-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 px-4 py-3 rounded-xl bg-signal/8 border border-signal/20 mb-5 overflow-hidden"
              >
                <AlertTriangle className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
                <p className="text-sm text-signal">{fieldErrors.general}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Name */}
            <Input
              ref={nameRef}
              id="signup-name"
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              error={fieldErrors.name}
              autoComplete="name"
              disabled={isSubmitting}
            />

            {/* Email */}
            <Input
              id="signup-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={fieldErrors.email}
              autoComplete="email"
              disabled={isSubmitting}
            />

            {/* Password */}
            <Input
              id="signup-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              error={fieldErrors.password}
              autoComplete="new-password"
              disabled={isSubmitting}
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

            {/* Confirm Password */}
            <Input
              id="signup-confirm-password"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
              disabled={isSubmitting}
              rightElement={
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-ink/40 hover:text-ink transition-colors duration-150 focus-visible:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Role selection */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                I am a…
              </span>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard role="LEARNER" selected={role === 'LEARNER'} onSelect={setRole} />
                <RoleCard role="INSTRUCTOR" selected={role === 'INSTRUCTOR'} onSelect={setRole} />
              </div>
              {fieldErrors.role && (
                <p role="alert" className="text-xs text-signal font-medium">{fieldErrors.role}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting || isResolving}
              className="w-full mt-1"
              id="signup-submit"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <p className="text-sm text-ink/40 text-center mt-7">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-ink font-semibold underline underline-offset-2 hover:text-signal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded"
            >
              Sign in
            </Link>
          </p>
        </GlassPanel>
      </motion.div>
    </div>
  );
};

export default SignupPage;
