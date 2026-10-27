export type PracticeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Practice {
  _id: string;
  courseId: string;
  topicId: string;
  questionBankId: string;
  createdBy: string;
  title: string;
  description: string;
  questionIds: string[];
  contributeToLearningEvidence: boolean;
  status: PracticeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePracticePayload {
  title: string;
  description?: string;
  questionIds?: string[];
  contributeToLearningEvidence?: boolean;
}

export interface UpdatePracticePayload {
  title?: string;
  description?: string;
  questionIds?: string[];
  contributeToLearningEvidence?: boolean;
}

export type PracticeFilterStatus = 'ALL' | PracticeStatus;
