import api from '../../../lib/axios';
import type { LearnerRecommendationsResponse } from '../types/recommendation.types';

export interface GetRecommendationsParams {
  limit?: number;
}

/**
 * Fetch personalized recommendations across all actively enrolled courses.
 */
export async function getLearnerRecommendations(
  params?: GetRecommendationsParams
): Promise<LearnerRecommendationsResponse> {
  const response = await api.get<{ data: LearnerRecommendationsResponse }>(
    '/learning/me/recommendations',
    { params }
  );
  return response.data.data;
}

/**
 * Fetch personalized recommendations for a specific enrolled course.
 */
export async function getLearnerCourseRecommendations(
  courseId: string,
  params?: GetRecommendationsParams
): Promise<LearnerRecommendationsResponse> {
  const response = await api.get<{ data: LearnerRecommendationsResponse }>(
    `/learning/me/courses/${courseId}/recommendations`,
    { params }
  );
  return response.data.data;
}

