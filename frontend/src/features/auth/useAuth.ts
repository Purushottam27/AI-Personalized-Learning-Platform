/**
 * useAuth hook — extract from AuthContext into its own file so that
 * AuthContext.tsx only exports components (satisfies react/only-export-components).
 */
import { useContext } from 'react';
import { AuthContext } from './auth-context-instance';
import type { AuthContextValue } from './AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
