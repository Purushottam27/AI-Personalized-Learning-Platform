/**
 * Auth API — centralized calls to /api/v1/auth/* endpoints.
 *
 * All calls go through the shared Axios instance (withCredentials, interceptors).
 * Callers receive typed response data or a structured ApiError on failure.
 */
import api from '../../../lib/axios';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type Role = 'LEARNER' | 'INSTRUCTOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  avatar: string | null;
  emailVerified: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: 'LEARNER' | 'INSTRUCTOR';
}

export interface ReactivatePayload {
  email: string;
  password: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** POST /api/v1/auth/login */
export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await api.post<{ data: { loggedUser: AuthUser } }>(
    '/auth/login',
    payload
  );
  return response.data.data.loggedUser;
}

/** POST /api/v1/auth/signup */
export async function signup(payload: SignupPayload): Promise<AuthUser> {
  const response = await api.post<{ data: AuthUser }>('/auth/signup', payload);
  return response.data.data;
}

/** POST /api/v1/auth/logout */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** POST /api/v1/auth/reactivate */
export async function reactivate(payload: ReactivatePayload): Promise<AuthUser> {
  const response = await api.post<{ data: { reactivatedUser: AuthUser } }>(
    '/auth/reactivate',
    payload
  );
  return response.data.data.reactivatedUser;
}

/** GET /api/v1/auth/me — fetches current authenticated user */
export async function getMe(): Promise<AuthUser> {
  const response = await api.get<{ data: AuthUser }>('/auth/me');
  return response.data.data;
}
