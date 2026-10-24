/**
 * profile.types.ts
 *
 * Types and schema-matching enums for Profile & Settings features
 * across Learner and Instructor roles.
 */

// ─── Exact Backend Enums ─────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = [
  'I have no prior knowledge',
  'I have a basic understanding',
  'I am comfortable with the fundamentals',
  'I have substantial experience',
  "I'm not sure",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const DAILY_STUDY_TIMES = [
  'Less than 1 hour',
  '1-2 hours',
  '2-3 hours',
  '3-4 hours',
  '5 or more hours',
] as const;

export type DailyStudyTime = (typeof DAILY_STUDY_TIMES)[number];

export const PREFERRED_LEARNING_FORMATS = [
  'Reading',
  'Videos',
  'Interactive Learning',
  'Practice Exercises',
  'Projects',
] as const;

export type PreferredLearningFormat = (typeof PREFERRED_LEARNING_FORMATS)[number];

// ─── Learner Profile ─────────────────────────────────────────────────────────

export interface LearnerStudyPreferences {
  dailyStudyTime?: DailyStudyTime | null;
  preferredLearningFormat?: PreferredLearningFormat[];
}

export interface LearnerProfileData {
  _id: string;
  userId: string;
  interests: string[];
  goals: string[];
  experienceLevel: ExperienceLevel | null;
  studyPreferences: LearnerStudyPreferences;
  onboardingState: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateLearnerProfilePayload {
  interests?: string[];
  goals?: string[];
  experienceLevel?: ExperienceLevel | null;
  studyPreferences?: {
    dailyStudyTime?: DailyStudyTime | null;
    preferredLearningFormat?: PreferredLearningFormat[];
  };
}

// ─── Instructor Profile ──────────────────────────────────────────────────────

export interface InstructorProfileData {
  _id: string;
  userId: string;
  professionalTitle: string | null;
  expertiseAreas: string[];
  bio: string | null;
  experienceYears: number | null;
  organization: string | null;
  socialLinks: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateInstructorProfilePayload {
  professionalTitle?: string | null;
  expertiseAreas?: string[];
  bio?: string | null;
  experienceYears?: number | null;
  organization?: string | null;
  socialLinks?: Record<string, string>;
}

// ─── Account & Auth ──────────────────────────────────────────────────────────

export interface UpdateAccountNamePayload {
  name: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
