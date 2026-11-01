import { useCallback, useEffect, useState } from 'react';
import { getLearnerCourseAnalytics } from '../api/learner.api';
import type { LearnerCourseAnalyticsData } from '../types/learner.types';
import { isApiError } from '../../../lib/axios';

export function useLearnerCourseAnalytics(courseId: string, days: number) {
  const [data, setData] = useState<LearnerCourseAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await getLearnerCourseAnalytics(courseId, days));
    } catch (err: unknown) {
      setError(isApiError(err) ? (err.message || 'Unable to load course analytics.') : 'An unexpected error occurred while loading course analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, days]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}
