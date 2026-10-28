export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface EstimatedDuration {
  source: 'MANUAL' | 'DERIVED';
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

export interface LearnerCourseItem {
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

export interface DiscoverCoursesQuery {
  search?: string;
  domain?: string;
  category?: string;
  difficulty?: CourseDifficulty;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCourses: number;
  totalPages: number;
}

export interface DiscoverCoursesResponse {
  courses: LearnerCourseItem[];
  pagination: PaginationMeta;
}
