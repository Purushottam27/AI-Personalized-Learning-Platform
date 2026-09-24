/**
 * LoginPage — /login
 *
 * Authentication entry point.
 *
 * Visual:
 * - Paper / Ink / Signal design system.
 * - Unified authentication surface with editorial learning panel + form panel.
 * - Adaptive Learning visualization centered within the editorial panel.
 * - Warm paper gradients and restrained atmospheric glow.
 * - Light/dark themes use semantic design tokens.
 * - Collapse to a single centered form on mobile.
 *
 * Account-state handling:
 * - ACCOUNT_DEACTIVATED → ReactivationCard dialog
 * - ACCOUNT_SUSPENDED  → locked state banner, no reactivation CTA
 * - Field errors       → inline beneath the relevant input
 *
 * Post-login navigation:
 * - resolveAuthDestination checks onboarding state and routes accordingly
 * - Post-reactivation navigation is handled entirely by ReactivationCard
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  CheckCircle2,
} from 'lucide-react';

import { useAuth } from '../useAuth';
import { isApiError } from '../../../lib/axios';
import { getRoleDashboard } from '../utils/getRoleDashboard';
import { resolveAuthDestination } from '../utils/resolveAuthDestination';

import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import ThemeToggle from '../../../components/ui/ThemeToggle';

import ReactivationCard from '../components/ReactivationCard';
import type { Role } from '../api/auth.api';

// ─── Error messages ───────────────────────────────────────────────────────────

const FIELD_ERROR_MESSAGES: Record<
  string,
  { field: 'email' | 'password' | 'general'; text: string }
> = {
  USER_NOT_FOUND: {
    field: 'email',
    text: 'No account exists with this email address.',
  },
  INCORRECT_PASSWORD: {
    field: 'password',
    text: 'Incorrect password. Please try again.',
  },
  VALIDATION_ERROR: {
    field: 'general',
    text: 'Please check your input and try again.',
  },
  TOKEN_NOT_FOUND: {
    field: 'general',
    text: 'An authentication error occurred. Please try again.',
  },
};

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

// ─── Adaptive Learning visualization ─────────────────────────────────────────

const LearningPathIllustration: React.FC = () => (
  <div
    className="relative mx-auto w-full max-w-120"
    aria-hidden="true"
  >
    {/* Central atmospheric glow */}
    <div
      className={[
        'absolute left-1/2 top-1/2',
        '-translate-x-1/2 -translate-y-1/2',
        'h-48 w-48 rounded-full',
        'bg-signal/8 blur-3xl',
      ].join(' ')}
    />

    <svg
      viewBox="0 0 600 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10 w-full overflow-visible"
    >
      <defs>
        {/* Signal radial glow */}
        <radialGradient
          id="adaptGlow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(300 285) rotate(90) scale(100)"
        >
          <stop
            offset="0"
            stopColor="currentColor"
            stopOpacity="0.18"
          />
          <stop
            offset="1"
            stopColor="currentColor"
            stopOpacity="0"
          />
        </radialGradient>

        {/* Hub gradient */}
        <linearGradient
  id="hubGradient"
  x1="250"
  y1="245"
  x2="350"
  y2="325"
  gradientUnits="userSpaceOnUse"
>
  <stop
    offset="0%"
    stopColor="#B94F35"
  />

  <stop
    offset="48%"
    stopColor="#C98262"
  />

  <stop
    offset="100%"
    stopColor="#536B50"
  />
</linearGradient>
      </defs>

      {/* ─────────────────────────────────────────────────────────
          ATMOSPHERIC CENTER
      ────────────────────────────────────────────────────────── */}

      <circle
        cx="300"
        cy="285"
        r="100"
        fill="url(#adaptGlow)"
        className="text-signal"
      />

      {/* ─────────────────────────────────────────────────────────
          ORBIT RINGS
      ────────────────────────────────────────────────────────── */}

      {/* Outer orbit */}
      <circle
        cx="300"
        cy="285"
        r="205"
        stroke="currentColor"
        className="text-border-muted"
        strokeWidth="1"
        opacity="0.7"
      />

      {/* Inner dotted orbit */}
      <circle
        cx="300"
        cy="285"
        r="168"
        stroke="currentColor"
        className="text-border-muted"
        strokeWidth="1"
        strokeDasharray="3 7"
        opacity="0.8"
      />

      {/* Decorative partial orbit */}
      <path
        d="M 113 285 A 187 187 0 0 1 487 285"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="1"
        strokeDasharray="2 9"
        opacity="0.45"
      />

      {/* ─────────────────────────────────────────────────────────
          CONNECTION ARROWS
      ────────────────────────────────────────────────────────── */}

      {/* ADAPT → LEARN */}
      <motion.path
        d="M 300 242 C 300 207 300 172 300 137"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 1,
          ease: 'easeInOut',
          delay: 0.6,
        }}
      />

      <motion.path
        d="M 291 151 L 300 134 L 309 151"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      />

      {/* ADAPT → PRACTICE */}
      <motion.path
        d="M 339 285 C 375 270 411 251 447 230"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 1,
          ease: 'easeInOut',
          delay: 1.1,
        }}
      />

      <motion.path
        d="M 431 222 L 451 228 L 444 246"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      />

      {/* ADAPT → ASSESS */}
      <motion.path
        d="M 331 324 C 352 353 370 382 381 414"
        stroke="currentColor"
        className="text-sage"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 1,
          ease: 'easeInOut',
          delay: 1.6,
        }}
      />

      <motion.path
        d="M 366 402 L 382 419 L 389 399"
        stroke="currentColor"
        className="text-sage"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
      />

      {/* ADAPT → NEXT STEP */}
      <motion.path
        d="M 261 319 C 225 337 189 363 159 398"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="7 7"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 1,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      <motion.path
        d="M 165 374 L 156 400 L 182 392"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
      />

      {/* ─────────────────────────────────────────────────────────
          LEARN NODE
      ────────────────────────────────────────────────────────── */}

      <motion.circle
        cx="300"
        cy="100"
        r="32"
        fill="currentColor"
        className="text-signal-soft"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.45"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 0.3,
          type: 'spring',
          stiffness: 180,
          damping: 14,
        }}
      />

      {/* Book icon */}
      {/* Book icon */}
<g
  transform="translate(0, -4)"
  stroke="currentColor"
  className="text-text-secondary"
  strokeWidth="2.2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M286 94 C291 91 296 92 300 95 V116 C296 113 291 112 286 115 Z" />
  <path d="M300 95 C304 92 309 91 314 94 V115 C309 112 304 113 300 116 Z" />
  <path d="M291 99 H296" />
  <path d="M304 99 H309" />
  <path d="M291 105 H296" />
  <path d="M304 105 H309" />
</g>

      <motion.text
        x="300"
        y="40"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-primary"
        fontSize="18"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="1.8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        LEARN
      </motion.text>

      <motion.text
        x="300"
        y="62"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-secondary"
        fontSize="13"
        fontFamily="DM Sans, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Build new skills
      </motion.text>

      {/* ─────────────────────────────────────────────────────────
          PRACTICE NODE
      ────────────────────────────────────────────────────────── */}

      <motion.circle
        cx="482"
        cy="214"
        r="32"
        fill="currentColor"
        className="text-signal-soft"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.45"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 0.9,
          type: 'spring',
          stiffness: 180,
          damping: 14,
        }}
      />

      {/* Practice chart icon */}
      <g
  transform="translate(7, 5)"
  stroke="currentColor"
  className="text-text-secondary"
  strokeWidth="2.2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M463 227 V210" />
  <path d="M472 227 V202" />
  <path d="M481 227 V194" />
  <path d="M461 227 H487" />
  <path d="M463 207 L472 198 L480 203 L489 191" />
  <path d="M483 191 H489 V197" />
</g>

      <motion.text
        x="523"
        y="204"
        textAnchor="start"
        fill="currentColor"
        className="text-text-primary"
        fontSize="18"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        PRACTICE
      </motion.text>

      <motion.text
        x="523"
        y="227"
        textAnchor="start"
        fill="currentColor"
        className="text-text-secondary"
        fontSize="13"
        fontFamily="DM Sans, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        Apply and improve
      </motion.text>

      {/* ─────────────────────────────────────────────────────────
          ASSESS NODE
      ────────────────────────────────────────────────────────── */}

      <motion.circle
        cx="401"
        cy="452"
        r="32"
        fill="currentColor"
        className="text-sage-soft"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.45"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 1.4,
          type: 'spring',
          stiffness: 180,
          damping: 14,
        }}
      />

      {/* Clipboard icon */}
      <g
        stroke="currentColor"
        className="text-sage"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect
          x="389"
          y="442"
          width="24"
          height="25"
          rx="3"
        />
        <path d="M395 442 V438 H407 V442" />
        <path d="M395 451 L399 455 L407 447" />
      </g>

      <motion.text
        x="401"
        y="505"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-primary"
        fontSize="18"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        ASSESS
      </motion.text>

      <motion.text
        x="401"
        y="528"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-secondary"
        fontSize="13"
        fontFamily="DM Sans, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        Track your progress
      </motion.text>

      {/* ─────────────────────────────────────────────────────────
          NEXT STEP NODE
      ────────────────────────────────────────────────────────── */}

      <motion.circle
        cx="121"
        cy="414"
        r="32"
        fill="currentColor"
        className="text-signal-soft"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.45"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 1.9,
          type: 'spring',
          stiffness: 180,
          damping: 14,
        }}
      />

      {/* Target icon */}
      <g
        stroke="currentColor"
        className="text-signal"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="121" cy="414" r="12" />
        <circle cx="121" cy="414" r="5" />
        <path d="M121 414 L132 403" />
        <path d="M127 403 H133 V409" />
      </g>

      <motion.text
        x="121"
        y="466"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-primary"
        fontSize="18"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="1.4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1 }}
      >
        NEXT STEP
      </motion.text>

      <motion.text
        x="121"
        y="488"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-secondary"
        fontSize="13"
        fontFamily="DM Sans, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
      >
        Personalized
      </motion.text>

      <motion.text
        x="121"
        y="506"
        textAnchor="middle"
        fill="currentColor"
        className="text-text-secondary"
        fontSize="13"
        fontFamily="DM Sans, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
      >
        recommendations
      </motion.text>

      {/* ─────────────────────────────────────────────────────────
          CENTRAL ADAPT HUB
      ────────────────────────────────────────────────────────── */}

      {/* Glow ring */}
      <motion.circle
        cx="300"
        cy="285"
        r="72"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="1"
        strokeOpacity="0.18"
        fill="none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 1.9,
          duration: 0.6,
        }}
      />

      {/* Outer hub ring */}
      <motion.circle
        cx="300"
        cy="285"
        r="57"
        stroke="currentColor"
        className="text-signal"
        strokeWidth="1"
        strokeOpacity="0.4"
        fill="none"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 2,
          duration: 0.5,
        }}
      />

      {/* Main hub */}
      <motion.circle
        cx="300"
        cy="285"
        r="48"
        fill="url(#hubGradient)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 2.1,
          type: 'spring',
          stiffness: 180,
          damping: 14,
        }}
      />

      {/* Brain icon */}
      <g
        stroke="currentColor"
        className="text-paper"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M289 284 C284 277 288 270 295 271 C298 264 307 266 308 273 C315 272 318 279 314 285 C318 291 313 298 307 297 C304 304 295 303 293 297 C286 299 282 292 289 284 Z" />
        <path d="M300 270 V300" />
        <path d="M290 280 H296" />
        <path d="M304 280 H311" />
        <path d="M290 290 H296" />
        <path d="M304 291 H311" />
      </g>

      {/* Central label */}
      <motion.text
        x="300"
        y="366"
        textAnchor="middle"
        fill="url(#hubGradient)"
        fontSize="23"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
      >
        ADAPT
      </motion.text>

      {/* Decorative orbit dots */}
      <circle
        cx="146"
        cy="181"
        r="5"
        fill="currentColor"
        className="text-text-tertiary"
      />

      <circle
        cx="455"
        cy="164"
        r="5"
        fill="currentColor"
        className="text-signal"
        opacity="0.55"
      />

      <circle
        cx="471"
        cy="347"
        r="5"
        fill="currentColor"
        className="text-text-tertiary"
      />

      <circle
        cx="216"
        cy="465"
        r="5"
        fill="currentColor"
        className="text-signal"
        opacity="0.5"
      />

      <circle
        cx="116"
        cy="286"
        r="5"
        fill="currentColor"
        className="text-sage"
      />
    </svg>
  </div>
);

// ─── Left editorial panel ─────────────────────────────────────────────────────

const LeftPanel: React.FC = () => (
  <div
    className={[
      'hidden lg:flex flex-col h-full',
      'relative overflow-hidden',
      'p-7 xl:p-9',
      'border-r border-border',
      'bg-linear-to-br',
      'from-surface-elevated',
      'via-surface-elevated',
      'to-signal/5',
    ].join(' ')}
  >
    {/* Top-right Signal glow */}
    <div
      aria-hidden="true"
      className={[
        'absolute -top-36 -right-28',
        'h-96 w-96 rounded-full',
        'bg-signal/10 blur-3xl',
        'pointer-events-none',
      ].join(' ')}
    />

    {/* Bottom-left warm Signal glow */}
    <div
      aria-hidden="true"
      className={[
        'absolute -bottom-40 -left-32',
        'h-80 w-80 rounded-full',
        'bg-signal/5 blur-3xl',
        'pointer-events-none',
      ].join(' ')}
    />

    {/* Subtle paper/signal atmosphere */}
    <div
      aria-hidden="true"
      className={[
        'absolute inset-0',
        'bg-linear-to-tr',
        'from-transparent via-transparent to-signal/4',
        'pointer-events-none',
      ].join(' ')}
    />

    {/* Subtle grain */}
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-[0.025] pointer-events-none"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
        backgroundSize: '200px 200px',
      }}
    />

    {/* Content */}
    <div className="relative z-10 flex h-full flex-col">

      {/* Main editorial composition */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="space-y-2 -translate-y-4 xl:-translate-y-6">

          {/* Main learning visualization */}
          <LearningPathIllustration />

          {/* Editorial headline */}
          <div className="text-center space-y-3 px-4">
            <p className="font-serif text-3xl xl:text-[2.15rem] font-semibold leading-[1.05] text-text-primary">
              Your learning path,
            </p>

            <p className="font-serif text-3xl xl:text-[2.15rem] font-light italic leading-[1.05] text-text-secondary">
              shaped by evidence.
            </p>

            <p className="mx-auto max-w-md pt-2 text-sm leading-relaxed text-text-secondary">
              Every session adapts to your strengths, gaps, and goals —
              so you always move forward with confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom quote */}
      <div className="border-t border-border-muted pt-4 text-center">
        <div className="mx-auto mb-3 h-0.5 w-10 bg-signal" />

        <p className="text-[10px] uppercase tracking-[0.18em] leading-relaxed text-text-primary">
          &ldquo;The measure of intelligence is the ability to change.&rdquo;
        </p>

        <span className="mt-1.5 block text-[10px] uppercase tracking-[0.16em] text-text-primary">
          — Albert Einstein
        </span>
      </div>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const {
    login,
    accountError,
    clearAccountError,
    user,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // Read signup-success state from navigation
  const signupSuccess = (
    location.state as {
      signupSuccess?: boolean;
      email?: string;
    } | null
  )?.signupSuccess;

  const signupEmail = (
    location.state as {
      signupSuccess?: boolean;
      email?: string;
    } | null
  )?.email;

  // Pre-fill email from signup redirect
  useEffect(() => {
    if (signupEmail) {
      setEmail(signupEmail);
    }
  }, [signupEmail]);

  // Redirect if already authenticated
  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated && user && !accountError) {
      setIsResolving(true);

      const from = (
        location.state as {
          from?: Location;
        } | null
      )?.from?.pathname;

      resolveAuthDestination(user.role, from)
        .then((destination) => {
          if (!cancelled) {
            navigate(destination, { replace: true });
          }
        })
        .catch(() => {
          if (!cancelled) {
            navigate(getRoleDashboard(user.role as Role), {
              replace: true,
            });
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user,
    accountError,
    navigate,
    location.state,
  ]);

  // Focus email on mount
  useEffect(() => {
    if (signupEmail) {
      // Let the user jump straight to password.
    } else {
      emailRef.current?.focus();
    }
  }, [signupEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      // Navigation handled by useEffect above.
    } catch (err) {
      if (isApiError(err)) {
        const mapping = FIELD_ERROR_MESSAGES[err.code];

        if (mapping) {
          setFieldErrors({
            [mapping.field]: mapping.text,
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

  const isSuspended =
    accountError?.code === 'ACCOUNT_SUSPENDED';

  const isDeactivated =
    accountError?.code === 'ACCOUNT_DEACTIVATED';

  return (
    <>
      <div
        className={[
          'relative min-h-screen',
          'flex items-center justify-center',
          'overflow-hidden',
          'bg-background',
          'px-4 py-6 md:px-8 md:py-10',
        ].join(' ')}
      >
        {/* Page-level Signal atmosphere */}
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute',
            '-top-48 left-1/2 -translate-x-1/2',
            'h-96 w-96 rounded-full',
            'bg-signal/5 blur-3xl',
          ].join(' ')}
        />

        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute',
            '-bottom-48 right-0',
            'h-96 w-96 rounded-full',
            'bg-signal/4 blur-3xl',
          ].join(' ')}
        />

        {/* Theme control */}
        <div className="absolute right-4 top-4 md:right-6 md:top-6 z-50">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative z-10 w-full max-w-5xl"
        >
          {/* Ambient outer glow */}
          <div
            aria-hidden="true"
            className={[
              'absolute -inset-3',
              'rounded-4xl',
              'bg-linear-to-r',
              'from-signal/8 via-transparent to-signal/5',
              'blur-2xl',
              'pointer-events-none',
            ].join(' ')}
          />

          {/* Unified authentication surface */}
          <div
            className={[
              'relative',
              'grid grid-cols-1',
              'lg:grid-cols-[0.95fr_1.05fr]',
              'overflow-hidden',
              'rounded-3xl',
              'border border-border',
              'bg-surface',
              'shadow-2xl shadow-ink/10',
            ].join(' ')}
          >
            <LeftPanel />

            {/* ─── Form panel ─── */}
            <div
              className={[
                'relative overflow-hidden',
                'bg-linear-to-br',
                'from-surface-elevated',
                'via-surface',
                'to-signal/5',
                'p-7 sm:p-8 md:p-10 xl:p-12',
                'flex flex-col justify-center',
                'min-h-145',
              ].join(' ')}
            >
              {/* Top-right Signal glow */}
              <div
                aria-hidden="true"
                className={[
                  'pointer-events-none absolute',
                  '-top-36 -right-32',
                  'h-80 w-80 rounded-full',
                  'bg-signal/8 blur-3xl',
                ].join(' ')}
              />

              {/* Bottom-left warm glow */}
              <div
                aria-hidden="true"
                className={[
                  'pointer-events-none absolute',
                  '-bottom-40 -left-32',
                  'h-80 w-80 rounded-full',
                  'bg-signal/4 blur-3xl',
                ].join(' ')}
              />

              {/* Paper atmosphere */}
              <div
                aria-hidden="true"
                className={[
                  'pointer-events-none absolute',
                  'top-0 left-0',
                  'h-72 w-72',
                  'rounded-full',
                  'bg-surface-elevated/50',
                  'blur-3xl',
                ].join(' ')}
              />

              {/* Inner warm gradient */}
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

              <div className="relative z-10">

                {/* Adaptive Learning wordmark */}
                <div className="mb-9 text-center">
                  <Link
                    to="/"
                    aria-label="Adaptive Learning home"
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
                </div>

                {/* Heading */}
                <div className="mb-8 text-center lg:text-left">
                  <h1 className="font-display text-2xl font-semibold text-text-primary mb-1.5">
                    Welcome back
                  </h1>

                  <p className="text-sm text-text-secondary">
                    Sign in to continue your learning journey.
                  </p>
                </div>

                {/* Signup success banner */}
                <AnimatePresence>
                  {signupSuccess && (
                    <motion.div
                      key="signup-success"
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
                      className="overflow-hidden mb-5"
                    >
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sage-soft border border-sage">
                        <CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" />

                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            Account created successfully
                          </p>

                          <p className="text-xs text-text-secondary mt-0.5">
                            Please sign in to continue to onboarding.
                          </p>
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
                      className="overflow-hidden mb-5"
                    >
                      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-warning-soft border border-warning">
                        <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />

                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            Account suspended
                          </p>

                          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                            This account has been suspended. Please
                            contact support if you believe this is an
                            error.
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
                      className="overflow-hidden mb-5"
                    >
                      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-error-soft border border-error">
                        <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />

                        <p className="text-sm text-error">
                          {fieldErrors.general}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login form */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex flex-col gap-5"
                >
                  <Input
                    ref={emailRef}
                    id="login-email"
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

                  <Input
                    id="login-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Your password"
                    error={fieldErrors.password}
                    autoComplete="current-password"
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
                          setShowPassword((v) => !v)
                        }
                        className={[
                          'rounded-md text-text-tertiary',
                          'transition-colors duration-150',
                          'hover:text-text-primary',
                          'focus-visible:outline-none',
                          'focus-visible:ring-2',
                          'focus-visible:ring-focus/25',
                          'focus-visible:ring-offset-2',
                          'focus-visible:ring-offset-surface',
                        ].join(' ')}
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
                    className="w-full mt-1 cursor-pointer"
                    id="login-submit"
                  >
                    {isResolving
                      ? 'Signing in…'
                      : 'Sign in'}
                  </Button>
                </form>

                {/* Signup link */}
                <p className="text-sm text-text-secondary text-center mt-7">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    className={[
                      'rounded text-text-primary font-semibold',
                      'underline underline-offset-2',
                      'transition-colors duration-150',
                      'hover:text-signal',
                      'focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-focus/25',
                    ].join(' ')}
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reactivation dialog */}
      {isDeactivated && (
        <ReactivationCard
          prefillEmail={
            accountError?.email ?? email
          }
          onClose={clearAccountError}
        />
      )}
    </>
  );
};

export default LoginPage;