import { useCallback, useEffect, useState } from 'react';
import type { InstructorCourseAnalytics, InstructorAnalyticsQuery } from '../types/analytics.types';
import { getInstructorCourseAnalytics } from '../api/analytics.api';
import { isApiError } from '../../../lib/axios';

interface UseInstructorCourseAnalyticsResult {
  analytics: InstructorCourseAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstructorCourseAnalytics = (
  courseId: string | null,
  query?: InstructorAnalyticsQuery
): UseInstructorCourseAnalyticsResult => {
  const [analytics, setAnalytics] = useState<InstructorCourseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!courseId) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getInstructorCourseAnalytics(courseId, query);
      setAnalytics(data);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError('Failed to load course analytics. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId, query?.page, query?.limit, query?.status, query?.search]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
};

