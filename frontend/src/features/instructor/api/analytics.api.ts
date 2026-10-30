import api from '../../../lib/axios';
import type {
  InstructorCourseAnalytics,
  InstructorAnalyticsQuery,
  InstructorAssessmentAnalyticsResponse,
  InstructorQuestionAnalyticsResponse,
} from '../types/analytics.types';

/**
 * GET /api/v1/instructor/courses/:courseId/analytics
 * Fetches comprehensive course-scoped analytics including overview, topic distributions, and learner breakdown.
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

/**
 * GET /api/v1/instructor/courses/:courseId/assessments/analytics
 * Fetches assessment-level metrics, score distributions, and actionable insights.
 */
export const getInstructorAssessmentAnalytics = async (
  courseId: string
): Promise<InstructorAssessmentAnalyticsResponse> => {
  const response = await api.get<{ data: InstructorAssessmentAnalyticsResponse }>(
    `/instructor/courses/${courseId}/assessments/analytics`
  );
  return response.data.data;
};

/**
 * GET /api/v1/instructor/assessments/:assessmentId/questions/analytics
 * Fetches question-level item metrics and response pattern signals.
 */
export const getInstructorQuestionAnalytics = async (
  assessmentId: string
): Promise<InstructorQuestionAnalyticsResponse> => {
  const response = await api.get<{ data: InstructorQuestionAnalyticsResponse }>(
    `/instructor/assessments/${assessmentId}/questions/analytics`
  );
  return response.data.data;
};


