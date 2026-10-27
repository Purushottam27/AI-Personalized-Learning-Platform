import api from '../../../lib/axios';
import type {
  CreatePracticePayload,
  Practice,
  UpdatePracticePayload,
} from '../types/practice.types';

interface ApiResponse<T> {
  success: boolean;
  statusCode?: number;
  data: T;
  message: string;
}

export const getPracticesByTopic = async (
  topicId: string,
): Promise<Practice[]> => {
  const response = await api.get<ApiResponse<Practice[]>>(
    `/topics/${topicId}/practices`,
  );
  return response.data.data;
};

export const getPracticesByCourse = async (
  courseId: string,
): Promise<Practice[]> => {
  const response = await api.get<ApiResponse<Practice[]>>(
    `/courses/${courseId}/practices`,
  );
  return response.data.data;
};

export const getPracticeById = async (
  practiceId: string,
): Promise<Practice> => {
  const response = await api.get<ApiResponse<Practice>>(
    `/practices/${practiceId}`,
  );
  return response.data.data;
};

export const createPractice = async (
  topicId: string,
  payload: CreatePracticePayload,
): Promise<Practice> => {
  const response = await api.post<ApiResponse<Practice>>(
    `/topics/${topicId}/practices`,
    payload,
  );
  return response.data.data;
};

export const updatePractice = async (
  practiceId: string,
  payload: UpdatePracticePayload,
): Promise<Practice> => {
  const response = await api.patch<ApiResponse<Practice>>(
    `/practices/${practiceId}`,
    payload,
  );
  return response.data.data;
};

export const publishPractice = async (
  practiceId: string,
): Promise<Practice> => {
  const response = await api.post<ApiResponse<Practice>>(
    `/practices/${practiceId}/publish`,
  );
  return response.data.data;
};

export const archivePractice = async (
  practiceId: string,
): Promise<Practice> => {
  const response = await api.post<ApiResponse<Practice>>(
    `/practices/${practiceId}/archive`,
  );
  return response.data.data;
};

export const restorePractice = async (
  practiceId: string,
): Promise<Practice> => {
  const response = await api.post<ApiResponse<Practice>>(
    `/practices/${practiceId}/restore`,
  );
  return response.data.data;
};
