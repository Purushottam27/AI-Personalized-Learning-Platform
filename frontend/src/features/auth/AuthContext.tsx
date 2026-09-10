/**
 * AuthContext — global authentication state and auth actions.
 *
 * Responsibilities:
 * - Initialise auth state on app load (GET /auth/me)
 * - Expose: user, isAuthenticated, isLoading, accountError
 * - Actions: login, signup, logout, reactivate, clearAccountError
 * - Handle account-state errors (ACCOUNT_DEACTIVATED / ACCOUNT_SUSPENDED /
 *   SESSION_EXPIRED) surfaced from the API layer and convert them into
 *   typed global state for UI to render.
 *
 * Note: AuthContext instance lives in auth-context-instance.ts
 *       useAuth hook lives in useAuth.ts
 *       (Both separated to satisfy react/only-export-components lint rule.)
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  reactivate as apiReactivate,
  getMe,
  type AuthUser,
  type LoginPayload,
  type SignupPayload,
  type ReactivatePayload,
} from './api/auth.api';
import { isApiError } from '../../lib/axios';
import { AuthContext } from './auth-context-instance';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountErrorCode =
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_SUSPENDED'
  | 'SESSION_EXPIRED';

export interface AccountError {
  code: AccountErrorCode;
  email?: string; // passed for the reactivation modal pre-fill
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accountError: AccountError | null;
}

export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  reactivate: (payload: ReactivatePayload) => Promise<void>;
  clearAccountError: () => void;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until initial /me resolves
  const [accountError, setAccountError] = useState<AccountError | null>(null);

  // ── Initialise: check existing session on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // No active session — that's fine; user is a guest.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const handleAccountError = useCallback(
    (err: unknown, emailHint?: string) => {
      if (isApiError(err)) {
        if (
          err.code === 'ACCOUNT_DEACTIVATED' ||
          err.code === 'ACCOUNT_SUSPENDED' ||
          err.code === 'SESSION_EXPIRED'
        ) {
          setAccountError({ code: err.code as AccountErrorCode, email: emailHint });
          return true; // consumed
        }
      }
      return false; // caller should handle it
    },
    []
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (payload: LoginPayload) => {
      try {
        const loggedUser = await apiLogin(payload);
        setUser(loggedUser);
        setAccountError(null);
      } catch (err) {
        if (!handleAccountError(err, payload.email)) {
          throw err; // re-throw for LoginPage to display inline errors
        }
      }
    },
    [handleAccountError]
  );

  const signup = useCallback(async (payload: SignupPayload) => {
    // Signup creates the account only — it does NOT create an authenticated session.
    // The backend /auth/signup endpoint does not set auth cookies.
    // After signup the user must log in separately.
    await apiSignup(payload);
    // Do NOT call setUser() here. Navigation to /login is handled by SignupPage.
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Even if the server-side logout fails, we clear local state.
    } finally {
      setUser(null);
      setAccountError(null);
    }
  }, []);

  const reactivate = useCallback(
    async (payload: ReactivatePayload) => {
      const reactivatedUser = await apiReactivate(payload);
      setUser(reactivatedUser);
      setAccountError(null);
    },
    []
  );

  const clearAccountError = useCallback(() => {
    setAccountError(null);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      accountError,
      login,
      signup,
      logout,
      reactivate,
      clearAccountError,
    }),
    [user, isLoading, accountError, login, signup, logout, reactivate, clearAccountError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

