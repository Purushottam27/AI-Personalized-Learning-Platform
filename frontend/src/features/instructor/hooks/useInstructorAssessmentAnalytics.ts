import { useCallback, useEffect, useState } from 'react';
import type { InstructorAssessmentAnalyticsResponse } from '../types/analytics.types';
import { getInstructorAssessmentAnalytics } from '../api/analytics.api';
import { isApiError } from '../../../lib/axios';

interface UseInstructorAssessmentAnalyticsResult {
  assessmentAnalytics: InstructorAssessmentAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstructorAssessmentAnalytics = (
  courseId: string | null
): UseInstructorAssessmentAnalyticsResult => {
  const [assessmentAnalytics, setAssessmentAnalytics] = useState<InstructorAssessmentAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessmentAnalytics = useCallback(async () => {
    if (!courseId) {
      setAssessmentAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getInstructorAssessmentAnalytics(courseId);
      setAssessmentAnalytics(data);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError('Failed to load assessment analytics. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAssessmentAnalytics();
  }, [fetchAssessmentAnalytics]);

  return {
    assessmentAnalytics,
    isLoading,
    error,
    refetch: fetchAssessmentAnalytics,
  };
};

