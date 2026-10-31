import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestIdRef = useRef(0);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!courseId) {
      setAnalytics(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalytics(null);

    try {
      const data = await getInstructorCourseAnalytics(courseId, query);
      if (requestId === requestIdRef.current) {
        setAnalytics(data);
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;

      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError('Failed to load course analytics. Please try again.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [courseId, query?.page, query?.limit, query?.status, query?.search]);

  useEffect(() => {
    void fetchAnalytics();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
};
