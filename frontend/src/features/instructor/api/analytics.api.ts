import api from '../../../lib/axios';
import type { InstructorCourseAnalytics, InstructorAnalyticsQuery } from '../types/analytics.types';

/**
 * GET /api/v1/instructor/courses/:courseId/analytics
 * Fetches comprehensive course-scoped analytics including overview, topic distributions, weak topics, and learner breakdown.
 */
export const getInstructorCourseAnalytics = async (
  courseId: string,
  query?: InstructorAnalyticsQuery
): Promise<InstructorCourseAnalytics> => {
  const response = await api.get<{ data: InstructorCourseAnalytics }>(
    `/instructor/courses/${courseId}/analytics`,
    { params: query }
  );
  return response.data.data;
};

