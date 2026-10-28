import { useState, useEffect, useCallback } from 'react';
import type { LearnerAnalyticsOverviewData } from '../types/learner.types';
import { getLearnerAnalyticsOverview } from '../api/learner.api';
import { isApiError } from '../../../lib/axios';

export function useLearnerAnalytics(initialDays: number = 7) {
  const [days, setDays] = useState<number>(initialDays);
  const [data, setData] = useState<LearnerAnalyticsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (trendDays: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await getLearnerAnalyticsOverview(trendDays);
      setData(overview);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message || 'Failed to load analytics overview.');
      } else {
        setError('An unexpected error occurred while fetching analytics.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    days,
    setDays,
    refetch: () => fetchAnalytics(days),
  };
}
