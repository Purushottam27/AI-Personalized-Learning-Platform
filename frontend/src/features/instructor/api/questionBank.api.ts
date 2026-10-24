import api from '../../../lib/axios';
import type {
  CreateQuestionBankPayload,
  QuestionBank,
  UpdateQuestionBankPayload,
} from '../types/questionBank.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getQuestionBankByTopic = async (
  topicId: string,
): Promise<QuestionBank> => {
  const response = await api.get<ApiResponse<QuestionBank>>(
    `/topics/${topicId}/question-bank`,
  );
  return response.data.data;
};

export const getQuestionBankById = async (
  questionBankId: string,
): Promise<QuestionBank> => {
  const response = await api.get<ApiResponse<QuestionBank>>(
    `/question-banks/${questionBankId}`,
  );
  return response.data.data;
};

export const createQuestionBank = async (
  topicId: string,
  payload: CreateQuestionBankPayload,
): Promise<QuestionBank> => {
  const response = await api.post<ApiResponse<QuestionBank>>(
    `/topics/${topicId}/question-bank`,
    payload,
  );
  return response.data.data;
};

export const updateQuestionBank = async (
  questionBankId: string,
  payload: UpdateQuestionBankPayload,
): Promise<QuestionBank> => {
  const response = await api.patch<ApiResponse<QuestionBank>>(
    `/question-banks/${questionBankId}`,
    payload,
  );
  return response.data.data;
};

export const archiveQuestionBank = async (
  questionBankId: string,
): Promise<QuestionBank> => {
  const response = await api.post<ApiResponse<QuestionBank>>(
    `/question-banks/${questionBankId}/archive`,
  );
  return response.data.data;
};

export const restoreQuestionBank = async (
  questionBankId: string,
): Promise<QuestionBank> => {
  const response = await api.post<ApiResponse<QuestionBank>>(
    `/question-banks/${questionBankId}/restore`,
  );
  return response.data.data;
};
