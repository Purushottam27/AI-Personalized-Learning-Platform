import api from '../../../lib/axios';

// ─── Shared Types ────────────────────────────────────────────────────────────

export type OnboardingState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// ─── Learner Profile ─────────────────────────────────────────────────────────

export interface LearnerStudyPreferences {
  dailyStudyTime?: string | null;
  preferredLearningFormat?: string[];
}

export interface LearnerProfile {
  _id: string;
  userId: string;
  interests: string[];
  goals: string[];
  experienceLevel: string | null;
  studyPreferences: LearnerStudyPreferences;
  onboardingState: OnboardingState;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerOnboardingUpdatePayload {
  interests?: string[];
  goals?: string[];
  experienceLevel?: string;
  studyPreferences?: LearnerStudyPreferences;
}

export async function getLearnerProfile(): Promise<LearnerProfile> {
  const response = await api.get<{ data: LearnerProfile }>('/learner-profile/me');
  return response.data.data;
}

export async function updateLearnerOnboarding(
  payload: LearnerOnboardingUpdatePayload
): Promise<LearnerProfile> {
  const response = await api.patch<{ data: LearnerProfile }>(
    '/learner-profile/me/onboarding',
    payload
  );
  return response.data.data;
}

// ─── Instructor Profile ──────────────────────────────────────────────────────

export interface InstructorProfile {
  _id: string;
  userId: string;
  professionalTitle: string | null;
  expertiseAreas: string[];
  bio: string | null;
  experienceYears: number | null;
  organization: string | null;
  socialLinks: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorOnboardingUpdatePayload {
  professionalTitle?: string;
  expertiseAreas?: string[];
}

export async function getInstructorProfile(): Promise<InstructorProfile> {
  const response = await api.get<{ data: InstructorProfile }>('/instructor-profile/me');
  return response.data.data;
}

export async function updateInstructorOnboarding(
  payload: InstructorOnboardingUpdatePayload
): Promise<InstructorProfile> {
  const response = await api.patch<{ data: InstructorProfile }>(
    '/instructor-profile/me/onboarding',
    payload
  );
  return response.data.data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isLearnerOnboardingComplete(profile: LearnerProfile | null): boolean {
  if (!profile) return false;
  return profile.onboardingState === 'COMPLETED';
}

export function isInstructorOnboardingComplete(profile: InstructorProfile | null): boolean {
  if (!profile) return false;
  // Instructor completion is derived from meaningful professionalTitle plus at least one expertiseAreas value
  const hasTitle = typeof profile.professionalTitle === 'string' && profile.professionalTitle.trim().length > 0;
  const hasExpertise = Array.isArray(profile.expertiseAreas) && profile.expertiseAreas.length > 0;
  return hasTitle && hasExpertise;
}
