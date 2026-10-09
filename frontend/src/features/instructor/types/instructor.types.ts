// Shared enums
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// Sub-document types
export interface EstimatedDuration {
  source: 'MANUAL';
  hours?: number | null;
  weeks?: number | null;
}

export interface Prerequisites {
  courses: string[];
  knowledge: string[];
}

export interface DiagnosticPolicy {
  enabled: boolean;
  passingScore: number | null;
  questionsPerAttempt: number | null;
  randomizeQuestions: boolean;
}

export interface ProgressionPolicy {
  lockingEnabled: boolean;
}

// Full Course shape (matches the backend model)
export interface Course {
  _id: string;
  title: string;
  description: string;
  createdBy: string;
  domain: string;
  category: string;
  difficulty: CourseDifficulty;
  objectives: string[];
  estimatedDuration?: EstimatedDuration;
  prerequisites?: Prerequisites;
  diagnosticPolicy?: DiagnosticPolicy;
  progressionPolicy?: ProgressionPolicy;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

// Simplified list item returned by GET /courses/instructor/courses
export interface InstructorCourse {
  _id: string;
  title: string;
  description?: string;
  status: CourseStatus;
  domain?: string;
  category?: string;
  difficulty?: CourseDifficulty;
  estimatedDuration?: EstimatedDuration;
  createdAt?: string;
  updatedAt?: string;
}

// Exactly what POST /api/v1/courses accepts.
// Do not include _id, createdBy, status, createdAt, or updatedAt.
export interface CreateCoursePayload {
  title: string;
  description: string;
  domain: string;
  category: string;
  difficulty: CourseDifficulty;
  objectives: string[];
  estimatedDuration?: EstimatedDuration;
  prerequisites?: {
    courses?: string[];
    knowledge?: string[];
  };
  diagnosticPolicy?: {
    enabled?: boolean;
    passingScore?: number | null;
    questionsPerAttempt?: number | null;
    randomizeQuestions?: boolean;
  };
  progressionPolicy?: {
    lockingEnabled?: boolean;
  };
}

// API response shapes
export interface InstructorCoursesResponse {
  success: boolean;
  data: InstructorCourse[];
}

export interface CourseResponse {
  success: boolean;
  data: Course;
  message: string;
}
