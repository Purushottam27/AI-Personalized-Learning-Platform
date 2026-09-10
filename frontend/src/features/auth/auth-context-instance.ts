/**
 * auth-context-instance.ts
 *
 * Isolates the React Context object so AuthContext.tsx can export only
 * the AuthProvider component (satisfying react/only-export-components).
 */
import { createContext } from 'react';
import type { AuthContextValue } from './AuthContext';

export const AuthContext = createContext<AuthContextValue | null>(null);
