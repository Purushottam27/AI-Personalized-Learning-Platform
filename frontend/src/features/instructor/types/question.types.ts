export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'ACTIVE' | 'ARCHIVED';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  _id: string;
  questionBankId: string;
  courseId: string;
  topicId: string;
  lessonId: string | null;
  createdBy: string;
  questionText: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer: string | string[];
  explanation: string;
  marks: number;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionPayload {
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  marks: number;
  difficulty: QuestionDifficulty;
  lessonId?: string | null;
}

export interface UpdateQuestionPayload {
  questionText?: string;
  type?: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  marks?: number;
  difficulty?: QuestionDifficulty;
  lessonId?: string | null;
}

export interface QuestionImportPreviewRow {
  rowNumber: number;
  isValid: boolean;
  isDuplicate: boolean;
  rowErrors: string[];
  questionText?: string;
  type?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  marks?: number;
  difficulty?: string;
}

export interface QuestionImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  blankRowsSkipped: number;
  importableRows: number;
}

export interface QuestionImportPreviewResponse {
  importId: string;
  status: string;
  expiresAt: string;
  summary: QuestionImportSummary;
  previewData: QuestionImportPreviewRow[];
}

export interface QuestionImportConfirmResponse {
  importId: string;
  status: string;
  confirmedAt: string;
  createdCount: number;
  createdQuestionIds: string[];
}
