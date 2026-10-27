export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type PracticeAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';

export interface PracticeQuestionOption {
  key: string;
  text: string;
}

export interface PracticeQuestionSnapshot {
  questionId: string;
  questionText: string;
  type: QuestionType;
  options: PracticeQuestionOption[];
  marks: number;
  difficulty: QuestionDifficulty;
  answer?: string | string[] | null;
  correctAnswer?: string | string[];
  explanation?: string;
  isCorrect?: boolean;
}

export interface LearnerPractice {
  _id: string;
  courseId: string;
  topicId: string;
  title: string;
  description: string;
  questionCount: number;
  contributeToLearningEvidence: boolean;
  status: 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}

export interface PracticeAttempt {
  _id: string;
  practiceId: string;
  learnerId: string;
  courseId: string;
  topicId: string;
  attemptNumber: number;
  status: PracticeAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  submissionReason: string | null;
  totalQuestions: number;
  totalMarks: number;
  marksAwarded: number | null;
  scorePercent: number | null;
  correctCount: number | null;
  contributeToLearningEvidence: boolean;
  questions: PracticeQuestionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticeHistoryItem {
  _id: string;
  practiceId: string;
  attemptNumber: number;
  status: PracticeAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  submissionReason: string | null;
  totalQuestions: number;
  totalMarks: number;
  marksAwarded: number | null;
  scorePercent: number | null;
  correctCount: number | null;
  contributeToLearningEvidence: boolean;
}

export interface PracticeAttemptHistoryResponse {
  practice: {
    _id: string;
    courseId: string;
    topicId: string;
    title: string;
    description?: string;
    contributeToLearningEvidence: boolean;
  };
  attempts: PracticeHistoryItem[];
}

export interface SavePracticeAnswerPayload {
  answer: string | string[] | null;
}

export interface SubmitPracticeAttemptPayload {
  reason?: 'MANUAL';
  answers?: Array<{
    questionId: string;
    answer: string | string[] | null;
  }>;
}
