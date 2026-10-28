export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';

export interface AssessmentOption {
  key: string;
  text: string;
}

export interface AssessmentAttemptQuestion {
  questionId: string;
  questionText: string;
  type: QuestionType;
  options: AssessmentOption[];
  marks: number;
  answer?: string | string[] | null;
  correctAnswer?: string | string[] | null;
  explanation?: string;
  isCorrect?: boolean;
}

export interface AssessmentAttempt {
  _id: string;
  assessmentId: string;
  learnerId: string;
  courseId: string;
  assessmentType: 'TOPIC' | 'DIAGNOSTIC' | 'FINAL';
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt?: string | null;
  submittedAt?: string | null;
  submissionReason?: string | null;
  passingScore: number;
  totalMarks: number;
  marksAwarded?: number | null;
  scorePercent?: number | null;
  passed?: boolean | null;
  questions: AssessmentAttemptQuestion[];
  createdAt: string;
  updatedAt: string;
}
