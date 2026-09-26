import api from '../../../lib/axios';
import type { LearnerDashboardData } from '../types/learner.types';

/**
 * Learner API — centralized calls for the learner dashboard and features.
 * Currently uses mocked/fallback structures as the backend is not fully implemented.
 */

export async function getLearnerDashboard(): Promise<LearnerDashboardData> {
  // Placeholder API call. Replace with actual endpoint when ready.
  // const response = await api.get<{ data: LearnerDashboardData }>('/learning/me/dashboard');
  // return response.data.data;
  
  // Simulated delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Return empty/placeholder state intentionally as instructed (not fabricating real user data)
  return {
    continueLearning: null,
    nextBestAction: null,
    progress: null,
    strengths: [],
    needsAttention: [],
    summary: null,
    recommendations: [],
    recentActivity: [],
  };
}
