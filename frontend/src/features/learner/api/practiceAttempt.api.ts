import api from '../../../lib/axios';
import type {
  LearnerPractice,
  PracticeAttempt,
  PracticeAttemptHistoryResponse,
  SavePracticeAnswerPayload,
  SubmitPracticeAttemptPayload,
} from '../types/practiceAttempt.types';

interface ApiResponse<T> {
  success: boolean;
  statusCode?: number;
  data: T;
  message: string;
}

/**
 * Fetch a published practice's metadata for learners
 */
export const getLearnerPracticeById = async (
  practiceId: string,
): Promise<LearnerPractice> => {
  const response = await api.get<ApiResponse<LearnerPractice>>(
    `/practices/${practiceId}`,
  );
  return response.data.data;
};

/**
 * Fetch all published practices for a topic
 */
export const getLearnerPracticesByTopic = async (
  topicId: string,
): Promise<LearnerPractice[]> => {
  const response = await api.get<ApiResponse<LearnerPractice[]>>(
    `/topics/${topicId}/practices`,
  );
  return response.data.data;
};

/**
 * Fetch all published practices for a course
 */
export const getLearnerPracticesByCourse = async (
  courseId: string,
): Promise<LearnerPractice[]> => {
  const response = await api.get<ApiResponse<LearnerPractice[]>>(
    `/courses/${courseId}/practices`,
  );
  return response.data.data;
};

/**
 * Start a new practice attempt
 */
export const startPracticeAttempt = async (
  practiceId: string,
): Promise<PracticeAttempt> => {
  const response = await api.post<ApiResponse<PracticeAttempt>>(
    `/practices/${practiceId}/attempts`,
  );
  return response.data.data;
};

/**
 * Fetch practice attempt history for the logged-in learner
 */
export const getPracticeAttemptHistory = async (
  practiceId: string,
): Promise<PracticeAttemptHistoryResponse> => {
  const response = await api.get<ApiResponse<PracticeAttemptHistoryResponse>>(
    `/practices/${practiceId}/attempts`,
  );
  return response.data.data;
};

/**
 * Fetch an existing practice attempt with its question snapshots and saved answers
 */
export const getPracticeAttempt = async (
  attemptId: string,
): Promise<PracticeAttempt> => {
  const response = await api.get<ApiResponse<PracticeAttempt>>(
    `/practice-attempts/${attemptId}`,
  );
  return response.data.data;
};

/**
 * Save an answer for a specific question in an in-progress attempt
 */
export const savePracticeAnswer = async (
  attemptId: string,
  questionId: string,
  answer: string | string[] | null,
): Promise<PracticeAttempt> => {
  const payload: SavePracticeAnswerPayload = { answer };
  const response = await api.put<ApiResponse<PracticeAttempt>>(
    `/practice-attempts/${attemptId}/questions/${questionId}/answer`,
    payload,
  );
  return response.data.data;
};

/**
 * Submit a practice attempt to finalize scoring and receive completed results
 */
export const submitPracticeAttempt = async (
  attemptId: string,
  payload?: SubmitPracticeAttemptPayload,
): Promise<PracticeAttempt> => {
  const response = await api.post<ApiResponse<PracticeAttempt>>(
    `/practice-attempts/${attemptId}/submit`,
    payload ?? {},
  );
  return response.data.data;
};
