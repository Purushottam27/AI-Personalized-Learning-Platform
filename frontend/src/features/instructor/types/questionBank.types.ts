export type QuestionBankStatus = 'ACTIVE' | 'ARCHIVED';

export interface QuestionBank {
  _id: string;
  courseId: string;
  topicId: string;
  createdBy: string;
  title: string;
  description: string;
  status: QuestionBankStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionBankPayload {
  title: string;
  description?: string;
}

export interface UpdateQuestionBankPayload {
  title?: string;
  description?: string;
}
