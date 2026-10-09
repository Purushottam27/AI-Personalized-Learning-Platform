import { useCallback, useEffect, useState } from 'react';
import type { InstructorCourse } from '../types/instructor.types';
import { getInstructorCourses } from '../api/instructor.api';
import { isApiError } from '../../../lib/axios';

interface UseInstructorCoursesResult {
  courses: InstructorCourse[];
  isEmpty: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstructorCourses = (): UseInstructorCoursesResult => {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getInstructorCourses();
      setCourses(data);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while fetching your courses.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialCourses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getInstructorCourses();
        if (isMounted) setCourses(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        if (isApiError(err)) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while fetching your courses.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchInitialCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    courses,
    isEmpty: !isLoading && !error && courses.length === 0,
    isLoading,
    error,
    refetch,
  };
};
