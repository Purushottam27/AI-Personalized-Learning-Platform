import api from '../../../lib/axios';
import type { WeeklyLearningReview } from '../types/weeklyLearningReview.types';

export const getWeeklyLearningReview = async (planId: string): Promise<WeeklyLearningReview> => {
  const res = await api.get<{ data: WeeklyLearningReview }>(`/learning/me/study-plan/${planId}/review`);
  return res.data.data;
};
