import api from '../../../lib/axios';
import type {
  CreateQuestionPayload,
  Question,
  QuestionImportConfirmResponse,
  QuestionImportPreviewResponse,
  UpdateQuestionPayload,
} from '../types/question.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getQuestionsByBank = async (
  questionBankId: string,
): Promise<Question[]> => {
  const response = await api.get<ApiResponse<Question[]>>(
    `/question-banks/${questionBankId}/questions`,
  );
  return response.data.data;
};

export const getQuestionById = async (
  questionId: string,
): Promise<Question> => {
  const response = await api.get<ApiResponse<Question>>(
    `/questions/${questionId}`,
  );
  return response.data.data;
};

export const createQuestion = async (
  questionBankId: string,
  payload: CreateQuestionPayload,
): Promise<Question> => {
  const response = await api.post<ApiResponse<Question>>(
    `/question-banks/${questionBankId}/questions`,
    payload,
  );
  return response.data.data;
};

export const updateQuestion = async (
  questionId: string,
  payload: UpdateQuestionPayload,
): Promise<Question> => {
  const response = await api.patch<ApiResponse<Question>>(
    `/questions/${questionId}`,
    payload,
  );
  return response.data.data;
};

export const archiveQuestion = async (
  questionId: string,
): Promise<Question> => {
  const response = await api.post<ApiResponse<Question>>(
    `/questions/${questionId}/archive`,
  );
  return response.data.data;
};

export const restoreQuestion = async (
  questionId: string,
): Promise<Question> => {
  const response = await api.post<ApiResponse<Question>>(
    `/questions/${questionId}/restore`,
  );
  return response.data.data;
};

export const importQuestionsPreview = async (
  questionBankId: string,
  file: File,
): Promise<QuestionImportPreviewResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiResponse<QuestionImportPreviewResponse>>(
    `/question-banks/${questionBankId}/import`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data.data;
};

export const confirmQuestionImport = async (
  importId: string,
): Promise<QuestionImportConfirmResponse> => {
  const response = await api.post<ApiResponse<QuestionImportConfirmResponse>>(
    `/question-imports/${importId}/confirm`,
  );
  return response.data.data;
};
