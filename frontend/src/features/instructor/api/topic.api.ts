import api from '../../../lib/axios';
import type { Topic, TopicPayload } from '../types/topic.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/** GET /api/v1/courses/:courseId/topics */
export const getTopicsByCourse = async (courseId: string): Promise<Topic[]> => {
  const response = await api.get<ApiResponse<Topic[]>>(`/courses/${courseId}/topics`);
  return response.data.data;
};

/** POST /api/v1/courses/:courseId/topics */
export const createTopic = async (
  courseId: string,
  payload: TopicPayload,
): Promise<Topic> => {
  const response = await api.post<ApiResponse<Topic>>(`/courses/${courseId}/topics`, payload);
  return response.data.data;
};

/** PATCH /api/v1/topics/:topicId */
export const updateTopic = async (
  topicId: string,
  payload: Partial<TopicPayload>,
): Promise<Topic> => {
  const response = await api.patch<ApiResponse<Topic>>(`/topics/${topicId}`, payload);
  return response.data.data;
};

/** PATCH /api/v1/courses/:courseId/topics/reorder */
export const reorderCourseTopics = async (
  courseId: string,
  topicIds: string[],
): Promise<Topic[]> => {
  const response = await api.patch<ApiResponse<Topic[]>>(
    `/courses/${courseId}/topics/reorder`,
    { topicIds },
  );
  return response.data.data;
};
