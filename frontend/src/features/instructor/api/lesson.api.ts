import api from '../../../lib/axios';
import type { Lesson, LessonPayload } from '../types/lesson.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/** GET /api/v1/topics/:topicId/lessons */
export const getLessonsByTopic = async (topicId: string): Promise<Lesson[]> => {
  const response = await api.get<ApiResponse<Lesson[]>>(`/topics/${topicId}/lessons`);
  return response.data.data;
};

/** POST /api/v1/topics/:topicId/lessons */
export const createLesson = async (
  topicId: string,
  payload: LessonPayload,
): Promise<Lesson> => {
  const response = await api.post<ApiResponse<Lesson>>(`/topics/${topicId}/lessons`, payload);
  return response.data.data;
};

/** GET /api/v1/lessons/:lessonId */
export const getLessonById = async (lessonId: string): Promise<Lesson> => {
  const response = await api.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
  return response.data.data;
};

/** PATCH /api/v1/lessons/:lessonId */
export const updateLesson = async (
  lessonId: string,
  payload: LessonPayload,
): Promise<Lesson> => {
  const response = await api.patch<ApiResponse<Lesson>>(`/lessons/${lessonId}`, payload);
  return response.data.data;
};

/** DELETE /api/v1/lessons/:lessonId */
export const deleteLesson = async (lessonId: string): Promise<Lesson> => {
  const response = await api.delete<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
  return response.data.data;
};

/** PATCH /api/v1/topics/:topicId/lessons/reorder */
export const reorderTopicLessons = async (
  topicId: string,
  lessonIds: string[],
): Promise<Lesson[]> => {
  const response = await api.patch<ApiResponse<Lesson[]>>(
    `/topics/${topicId}/lessons/reorder`,
    { lessonIds },
  );
  return response.data.data;
};
