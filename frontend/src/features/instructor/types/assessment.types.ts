export type AssessmentType = 'TOPIC' | 'DIAGNOSTIC' | 'FINAL';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Assessment {
  _id: string;
  courseId: string;
  topicId?: string | null;
  createdBy: string;
  type: AssessmentType;
  title: string;
  description?: string;
  questionIds: string[];
  questionsPerAttempt: number;
  passingScore: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  timeLimitMinutes?: number | null;
  opensAt?: string | null;
  closesAt?: string | null;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentPayload {
  courseId: string;
  topicId?: string;
  type: AssessmentType;
  title: string;
  description?: string;
  questionIds?: string[];
  questionsPerAttempt?: number;
  passingScore?: number;
  maxAttempts?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  timeLimitMinutes?: number | null;
}

export interface UpdateAssessmentPayload {
  title?: string;
  description?: string;
  questionIds?: string[];
  questionsPerAttempt?: number;
  passingScore?: number;
  maxAttempts?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  timeLimitMinutes?: number | null;
}
