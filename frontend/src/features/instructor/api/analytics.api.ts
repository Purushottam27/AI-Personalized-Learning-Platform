import api from '../../../lib/axios';
import type {
  InstructorCourseAnalytics,
  InstructorAnalyticsQuery,
  InstructorCourseLearnerDetails,
  InstructorAssessmentAnalyticsResponse,
  InstructorQuestionAnalyticsResponse,
} from '../types/analytics.types';

/**
 * GET /api/v1/instructor/courses/:courseId/analytics
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
 * GET /api/v1/instructor/courses/:courseId/learners/:learnerId
 * Returns instructor-safe details scoped to one course and learner.
 */
export const getInstructorCourseLearnerDetails = async (
  courseId: string,
  learnerId: string
): Promise<InstructorCourseLearnerDetails> => {
  const response = await api.get<{ data: InstructorCourseLearnerDetails }>(
    `/instructor/courses/${courseId}/learners/${learnerId}`
  );
  return response.data.data;
};

/**
 * GET /api/v1/instructor/courses/:courseId/assessments/analytics
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
 */
export const getInstructorQuestionAnalytics = async (
  assessmentId: string
): Promise<InstructorQuestionAnalyticsResponse> => {
  const response = await api.get<{ data: InstructorQuestionAnalyticsResponse }>(
    `/instructor/assessments/${assessmentId}/questions/analytics`
  );
  return response.data.data;
};
