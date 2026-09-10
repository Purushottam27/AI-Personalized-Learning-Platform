/**
 * getRoleDashboard — maps a backend user role to the correct dashboard path.
 * Uses backend role strings as the source of truth.
 */
import type { Role } from '../api/auth.api';

const ROLE_DASHBOARDS: Record<Role, string> = {
  LEARNER: '/learner-dashboard',
  INSTRUCTOR: '/instructor-dashboard',
  ADMIN: '/admin-dashboard',
};

export function getRoleDashboard(role: Role): string {
  return ROLE_DASHBOARDS[role] ?? '/';
}
