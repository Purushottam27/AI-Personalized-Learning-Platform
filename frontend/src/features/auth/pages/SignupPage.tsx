/**
 * SignupPage — /signup
 *
 * Visual:
 * - Paper / Ink / Signal design system.
 * - Matches the finalized LoginPage visual language.
 * - Warm editorial gradients with subtle atmospheric glow.
 * - Responsive authentication surface.
 * - Centered upper content on small and medium screens.
 * - Signal → Terracotta → Sage gradient for the Learning wordmark.
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
import {
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../useAuth';
import { isApiError } from '../../../lib/axios';
import { getRoleDashboard } from '../utils/getRoleDashboard';
import { resolveAuthDestination } from '../utils/resolveAuthDestination';

import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import ThemeToggle from '../../../components/ui/ThemeToggle';

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

// ─── Brand Mark ───────────────────────────────────────────────────────────────

const BrandMark: React.FC = () => (
  <Link
    to="/"
    aria-label="Adaptive Learning home"
    className={[
      'inline-block rounded',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-focus/25',
    ].join(' ')}
  >
    <span className="font-serif text-3xl xl:text-4xl font-semibold tracking-tight text-text-primary">
      Adaptive
    </span>

    <span
      className={[
        'font-serif text-3xl xl:text-4xl font-light ml-1.5',
        'bg-linear-to-r',
        'from-signal',
        'via-[#C98262]',
        'to-sage',
        'bg-clip-text text-transparent',
      ].join(' ')}
    >
      Learning
    </span>
  </Link>
);

// ─── Role Card ────────────────────────────────────────────────────────────────

interface RoleCardProps {
  role: SignupRole;
  selected: boolean;
  onSelect: (role: SignupRole) => void;
}

const ROLE_META: Record<
  SignupRole,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
  }
> = {
  LEARNER: {
    label: 'Learner',
    description:
      'I want to learn and grow with a personalized path.',
    icon: <BookOpen className="w-5 h-5" />,
  },

  INSTRUCTOR: {
    label: 'Instructor',
    description:
      'I want to teach, create courses, and guide learners.',
    icon: <GraduationCap className="w-5 h-5" />,
  },
};

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  selected,
  onSelect,
}) => {
  const meta = ROLE_META[role];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(role)}
      className={[
        'group flex w-full items-start gap-3',
        'rounded-2xl border p-4 text-left',
        'transition-all duration-200',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-focus/25',
        'cursor-pointer',

        selected
          ? [
              'border-signal',
              'bg-signal-soft',
              'shadow-md shadow-signal/5',
            ].join(' ')
          : [
              'border-border',
              'bg-surface/80',
              'hover:border-text-tertiary',
              'hover:bg-surface-elevated',
              'hover:shadow-md hover:shadow-ink/5',
              'active:bg-surface-disabled',
            ].join(' '),
      ].join(' ')}
    >
      {/* Icon */}
      <div
        className={[
          'flex h-10 w-10 shrink-0',
          'items-center justify-center',
          'rounded-xl',
          'transition-all duration-200',

          selected
            ? [
                'bg-signal',
                'text-paper',
                'shadow-sm shadow-signal/20',
              ].join(' ')
            : [
                'bg-surface-elevated',
                'text-text-tertiary',
                'group-hover:text-text-secondary',
              ].join(' '),
        ].join(' ')}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 pt-0.5">
        <p
          className={[
            'text-sm font-semibold',
            selected
              ? 'text-signal'
              : 'text-text-primary',
          ].join(' ')}
        >
          {meta.label}
        </p>

        <p
          className={[
            'mt-1 text-xs leading-relaxed',
            selected
              ? 'text-text-secondary'
              : 'text-text-tertiary',
          ].join(' ')}
        >
          {meta.description}
        </p>
      </div>

      {/* Selection indicator */}
      <div
        aria-hidden="true"
        className={[
          'ml-auto mt-1 h-4 w-4 shrink-0',
          'rounded-full border',
          'transition-all duration-200',

          selected
            ? [
                'border-signal',
                'bg-signal',
                'shadow-sm shadow-signal/20',
              ].join(' ')
            : [
                'border-border',
                'bg-transparent',
                'group-hover:border-text-tertiary',
              ].join(' '),
        ].join(' ')}
      >
        {selected && (
          <div className="mx-auto mt-0.75 h-1.5 w-1.5 rounded-full bg-paper" />
        )}
      </div>
    </button>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SignupPage: React.FC = () => {
  const {
    signup,
    user,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [role, setRole] =
    useState<SignupRole | null>(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isResolving, setIsResolving] =
    useState(false);

  const nameRef =
    useRef<HTMLInputElement>(null);

  // ─── Redirect authenticated users ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated && user) {
      setIsResolving(true);

      resolveAuthDestination(user.role)
        .then((destination) => {
          if (!cancelled) {
            navigate(destination, {
              replace: true,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            navigate(
              getRoleDashboard(
                user.role as Role
              ),
              {
                replace: true,
              }
            );
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user,
    navigate,
  ]);

  // ─── Initial focus ─────────────────────────────────────────────────────────

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email =
        'Enter a valid email address.';
    }

    if (!password) {
      errors.password =
        'Password is required.';
    } else if (password.length < 8) {
      errors.password =
        'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword =
        'Please confirm your password.';
    } else if (
      password !== confirmPassword
    ) {
      errors.confirmPassword =
        'Passwords do not match.';
    }

    if (!role) {
      errors.role =
        'Please select a role to continue.';
    }

    return errors;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setFieldErrors({});

    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        role: role!,
      });

      // Signup succeeded — account created.
      // Redirect to login with a success hint.
      navigate('/login', {
        replace: true,
        state: {
          signupSuccess: true,
          email: email.trim(),
        },
      });
    } catch (err) {
      if (isApiError(err)) {
        if (
          err.code === 'EMAIL_ALREADY_EXIST'
        ) {
          setFieldErrors({
            email:
              'An account with this email already exists. Try signing in instead.',
          });
        } else if (
          err.code === 'VALIDATION_ERROR'
        ) {
          setFieldErrors({
            general:
              'Please check your input and try again.',
          });
        } else {
          setFieldErrors({
            general: err.message,
          });
        }
      } else {
        setFieldErrors({
          general:
            'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'relative min-h-screen',
        'flex items-center justify-center',
        'overflow-hidden',
        'bg-background',
        'px-4 py-8',
        'sm:px-6 sm:py-10',
        'md:px-8 md:py-12',
      ].join(' ')}
    >
      {/* ─────────────────────────────────────────────────────────
          PAGE ATMOSPHERE
      ────────────────────────────────────────────────────────── */}

      {/* Top Signal glow */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute',
          '-top-48 left-1/2',
          '-translate-x-1/2',
          'h-96 w-96',
          'rounded-full',
          'bg-signal/6',
          'blur-3xl',
        ].join(' ')}
      />

      {/* Bottom-right Signal glow */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute',
          '-bottom-48 -right-24',
          'h-96 w-96',
          'rounded-full',
          'bg-signal/5',
          'blur-3xl',
        ].join(' ')}
      />

      {/* Bottom-left Sage atmosphere */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute',
          '-bottom-56 -left-40',
          'h-96 w-96',
          'rounded-full',
          'bg-sage/4',
          'blur-3xl',
        ].join(' ')}
      />

      {/* Theme control */}
      <div className="absolute right-4 top-4 md:right-6 md:top-6 z-50">
        <ThemeToggle />
      </div>

      {/* ─────────────────────────────────────────────────────────
          MAIN AUTH SURFACE
      ────────────────────────────────────────────────────────── */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Outer atmospheric glow */}
        <div
          aria-hidden="true"
          className={[
            'absolute -inset-3',
            'rounded-4xl',
            'bg-linear-to-r',
            'from-signal/7',
            'via-transparent',
            'to-sage/5',
            'blur-2xl',
            'pointer-events-none',
          ].join(' ')}
        />

        {/* Authentication card */}
        <div
          className={[
            'relative overflow-hidden',
            'rounded-3xl',
            'border border-border',
            'bg-linear-to-br',
            'from-surface-elevated',
            'via-surface',
            'to-signal/4',
            'shadow-2xl shadow-ink/10',
          ].join(' ')}
        >
          {/* Top-right Signal glow */}
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute',
              '-top-40 -right-32',
              'h-80 w-80',
              'rounded-full',
              'bg-signal/8',
              'blur-3xl',
            ].join(' ')}
          />

          {/* Bottom-left Sage glow */}
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute',
              '-bottom-40 -left-32',
              'h-80 w-80',
              'rounded-full',
              'bg-sage/4',
              'blur-3xl',
            ].join(' ')}
          />

          {/* Paper glow */}
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute',
              '-top-20 -left-20',
              'h-64 w-64',
              'rounded-full',
              'bg-surface-elevated/60',
              'blur-3xl',
            ].join(' ')}
          />

          {/* Subtle gradient atmosphere */}
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-0',
              'bg-linear-to-br',
              'from-surface-elevated/40',
              'via-transparent',
              'to-signal/4',
            ].join(' ')}
          />

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            {/* ───────────────────────────────────────────────────
                BRAND
            ─────────────────────────────────────────────────── */}

            <div className="mb-8 text-center">
              <BrandMark />
            </div>

            {/* ───────────────────────────────────────────────────
                HEADING
            ─────────────────────────────────────────────────── */}

            <div className="mb-8 text-center md:text-left">
              <h1 className="font-display text-2xl sm:text-[1.7rem] font-semibold text-text-primary mb-1.5">
                Create your account
              </h1>

              <p className="text-sm text-text-secondary leading-relaxed">
                Start your personalized learning
                journey today.
              </p>
            </div>

            {/* ───────────────────────────────────────────────────
                GENERAL ERROR
            ─────────────────────────────────────────────────── */}

            <AnimatePresence>
              {fieldErrors.general && (
                <motion.div
                  key="general-error"
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
                  className="flex items-start gap-2 px-4 py-3 rounded-xl bg-error-soft border border-error mb-5 overflow-hidden"
                >
                  <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />

                  <p className="text-sm text-error">
                    {fieldErrors.general}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ───────────────────────────────────────────────────
                FORM
            ─────────────────────────────────────────────────── */}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              {/* Name */}
              <Input
                ref={nameRef}
                id="signup-name"
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
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
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                error={fieldErrors.email}
                autoComplete="email"
                disabled={isSubmitting}
              />

              {/* Password */}
              <Input
                id="signup-password"
                label="Password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Min. 8 characters"
                error={fieldErrors.password}
                autoComplete="new-password"
                disabled={isSubmitting}
                rightElement={
                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() =>
                      setShowPassword(
                        (v) => !v
                      )
                    }
                    className={[
                      'rounded-md',
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
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />

              {/* Confirm Password */}
              <Input
                id="signup-confirm-password"
                label="Confirm Password"
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Repeat your password"
                error={
                  fieldErrors.confirmPassword
                }
                autoComplete="new-password"
                disabled={isSubmitting}
                rightElement={
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (v) => !v
                      )
                    }
                    className={[
                      'rounded-md',
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
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />

              {/* ────────────────────────────────────────────────
                  ROLE SELECTION
              ──────────────────────────────────────────────── */}

              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                    I am a…
                  </span>

                  <span className="text-[10px] uppercase tracking-wider text-text-disabled">
                    Choose one
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RoleCard
                    role="LEARNER"
                    selected={
                      role === 'LEARNER'
                    }
                    onSelect={setRole}
                  />

                  <RoleCard
                    role="INSTRUCTOR"
                    selected={
                      role === 'INSTRUCTOR'
                    }
                    onSelect={setRole}
                  />
                </div>

                {fieldErrors.role && (
                  <p
                    role="alert"
                    className="text-xs text-error font-medium"
                  >
                    {fieldErrors.role}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={
                  isSubmitting ||
                  isResolving
                }
                className="w-full mt-1 cursor-pointer"
                id="signup-submit"
              >
                {isSubmitting
                  ? 'Creating account…'
                  : 'Create Account'}
              </Button>
            </form>

            {/* ───────────────────────────────────────────────────
                LOGIN LINK
            ─────────────────────────────────────────────────── */}

            <p className="text-sm text-text-secondary text-center mt-7">
              Already have an account?{' '}
              <Link
                to="/login"
                className={[
                  'rounded',
                  'text-text-primary',
                  'font-semibold',
                  'underline underline-offset-2',
                  'transition-colors duration-150',
                  'hover:text-signal',
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                ].join(' ')}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;