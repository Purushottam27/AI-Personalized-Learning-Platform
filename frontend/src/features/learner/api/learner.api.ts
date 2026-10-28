import api from '../../../lib/axios';
import type {
  LearnerDashboardData,
  LearnerCourseProgressDetail,
  LearnerAnalyticsOverviewData,
} from '../types/learner.types';

/**
 * Learner API — centralized calls for learner dashboard, course progress, and analytics.
 */

export async function getLearnerDashboard(): Promise<LearnerDashboardData> {
  const response = await api.get<{ data: LearnerDashboardData }>('/learning/me/dashboard');
  return response.data.data;
}

export async function getLearnerCourseProgress(courseId: string): Promise<LearnerCourseProgressDetail> {
  const response = await api.get<{ data: LearnerCourseProgressDetail }>(`/learning/me/courses/${courseId}/progress`);
  return response.data.data;
}

export async function getLearnerAnalyticsOverview(days: number = 7): Promise<LearnerAnalyticsOverviewData> {
  const response = await api.get<{ data: LearnerAnalyticsOverviewData }>('/learning/me/analytics/overview', {
    params: { days },
  });
  return response.data.data;
}
