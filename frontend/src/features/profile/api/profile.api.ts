/**
 * profile.api.ts
 *
 * API functions for Account updates, Avatar upload, Role-specific profiles,
 * Password change, and Account deactivation.
 */

import api from '../../../lib/axios';
import type { AuthUser } from '../../auth/api/auth.api';
import type {
  LearnerProfileData,
  UpdateLearnerProfilePayload,
  InstructorProfileData,
  UpdateInstructorProfilePayload,
  ChangePasswordPayload,
} from '../types/profile.types';

// ─── Account & Avatar ────────────────────────────────────────────────────────

/**
 * Updates current user account name.
 * PATCH /api/v1/users/me
 */
export async function updateAccountName(name: string): Promise<AuthUser> {
  const response = await api.patch<{ data: AuthUser }>('/users/me', { name });
  return response.data.data;
}

/**
 * Uploads user avatar.
 * PATCH /api/v1/users/me/avatar
 */
export async function updateAvatar(file: File): Promise<{ _id: string; avatar: string | null }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.patch<{ data: { _id: string; avatar: string | null } }>(
    '/users/me/avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
}

// ─── Learner Profile ─────────────────────────────────────────────────────────

/**
 * Retrieves the current learner's profile.
 * GET /api/v1/learner-profile/me
 */
export async function getLearnerProfile(): Promise<LearnerProfileData> {
  const response = await api.get<{ data: LearnerProfileData }>('/learner-profile/me');
  return response.data.data;
}

/**
 * Updates the current learner's profile.
 * PATCH /api/v1/learner-profile/me
 */
export async function updateLearnerProfile(
  payload: UpdateLearnerProfilePayload
): Promise<LearnerProfileData> {
  const response = await api.patch<{ data: LearnerProfileData }>(
    '/learner-profile/me',
    payload
  );
  return response.data.data;
}

// ─── Instructor Profile ──────────────────────────────────────────────────────

/**
 * Retrieves the current instructor's profile.
 * GET /api/v1/instructor-profile/me
 */
export async function getInstructorProfile(): Promise<InstructorProfileData> {
  const response = await api.get<{ data: InstructorProfileData }>('/instructor-profile/me');
  return response.data.data;
}

/**
 * Updates the current instructor's profile.
 * PATCH /api/v1/instructor-profile/me
 */
export async function updateInstructorProfile(
  payload: UpdateInstructorProfilePayload
): Promise<InstructorProfileData> {
  const response = await api.patch<{ data: InstructorProfileData }>(
    '/instructor-profile/me',
    payload
  );
  return response.data.data;
}

// ─── Security & Account Management ───────────────────────────────────────────

/**
 * Changes password for authenticated user.
 * POST /api/v1/auth/change-password
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post('/auth/change-password', payload);
}

/**
 * Deactivates current user account and revokes active refresh sessions.
 * DELETE /api/v1/users/me
 */
export async function deactivateAccount(): Promise<void> {
  await api.delete('/users/me');
}
