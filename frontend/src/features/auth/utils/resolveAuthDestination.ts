import { getRoleDashboard } from './getRoleDashboard';
import type { Role } from '../api/auth.api';
import {
  getLearnerProfile,
  getInstructorProfile,
  isLearnerOnboardingComplete,
  isInstructorOnboardingComplete,
} from '../../onboarding/api/onboarding.api';
import { isApiError } from '../../../lib/axios';

/**
 * Resolves the correct destination for an authenticated user.
 * It checks the onboarding state by fetching the user's profile.
 * - If onboarding is incomplete (or returns 404), routes to /onboarding.
 * - If onboarding is complete, routes to the requested `from` path or the role dashboard.
 * - Admin always goes to admin dashboard.
 */
export async function resolveAuthDestination(
  role: string,
  from?: string
): Promise<string> {
  if (role === 'ADMIN') {
    return from ?? '/admin-dashboard';
  }

  try {
    if (role === 'LEARNER') {
      const profile = await getLearnerProfile();
      if (!isLearnerOnboardingComplete(profile)) {
        return '/onboarding';
      }
    } else if (role === 'INSTRUCTOR') {
      const profile = await getInstructorProfile();
      if (!isInstructorOnboardingComplete(profile)) {
        return '/onboarding';
      }
    }
    return from ?? getRoleDashboard(role as Role);
  } catch (err: unknown) {
    if (isApiError(err) && err.status === 404) {
      // Profile not found means onboarding hasn't started
      return '/onboarding';
    }
    // If an unexpected error occurs, fallback to the dashboard so they aren't stuck,
    // or fallback to onboarding? Dashboard is safer; if onboarding is actually incomplete,
    // the dashboard/guard will catch them.
    return from ?? getRoleDashboard(role as Role);
  }
}
