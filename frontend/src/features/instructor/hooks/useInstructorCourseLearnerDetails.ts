import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '../../../lib/axios';
import { getInstructorCourseLearnerDetails } from '../api/analytics.api';
import type { InstructorCourseLearnerDetails } from '../types/analytics.types';

interface UseInstructorCourseLearnerDetailsResult {
  details: InstructorCourseLearnerDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstructorCourseLearnerDetails = (
  courseId: string | null,
  learnerId: string | null
): UseInstructorCourseLearnerDetailsResult => {
  const [details, setDetails] = useState<InstructorCourseLearnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchDetails = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!courseId || !learnerId) {
      setDetails(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDetails(null);

    try {
      const response = await getInstructorCourseLearnerDetails(courseId, learnerId);
      if (requestId === requestIdRef.current) setDetails(response);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(isApiError(err) ? err.message : 'Unable to load learner details. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [courseId, learnerId]);

  useEffect(() => {
    void fetchDetails();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchDetails]);

  return { details, isLoading, error, refetch: fetchDetails };
};
