import api from "../../../lib/axios";
import type { Lesson, LessonPayload } from "../types/lesson.types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getLessonsByTopic = async (topicId: string): Promise<Lesson[]> => {
  const response = await api.get<ApiResponse<Lesson[]>>(`/topics/${topicId}/lessons`);
  return response.data.data;
};

export const createLesson = async (topicId: string, payload: LessonPayload): Promise<Lesson> => {
  const response = await api.post<ApiResponse<Lesson>>(`/topics/${topicId}/lessons`, payload);
  return response.data.data;
};

export const getLessonById = async (lessonId: string): Promise<Lesson> => {
  const response = await api.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
  return response.data.data;
};

export const updateLesson = async (lessonId: string, payload: LessonPayload): Promise<Lesson> => {
  const response = await api.patch<ApiResponse<Lesson>>(`/lessons/${lessonId}`, payload);
  return response.data.data;
};

export const archiveLesson = async (lessonId: string): Promise<Lesson> => {
  const response = await api.post<ApiResponse<Lesson>>(`/lessons/${lessonId}/archive`);
  return response.data.data;
};

export const restoreLesson = async (lessonId: string): Promise<Lesson> => {
  const response = await api.post<ApiResponse<Lesson>>(`/lessons/${lessonId}/restore`);
  return response.data.data;
};

// Retained for draft-only permanent cleanup. Do not use for published lessons.
export const deleteLesson = async (lessonId: string): Promise<Lesson> => {
  const response = await api.delete<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
  return response.data.data;
};

export const reorderTopicLessons = async (topicId: string, lessonIds: string[]): Promise<Lesson[]> => {
  const response = await api.patch<ApiResponse<Lesson[]>>(
    `/topics/${topicId}/lessons/reorder`,
    { lessonIds },
  );
  return response.data.data;
};
