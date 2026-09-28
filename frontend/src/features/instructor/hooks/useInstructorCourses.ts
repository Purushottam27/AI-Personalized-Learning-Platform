import { useState, useEffect } from 'react';
import type { InstructorCourse } from '../types/instructor.types';
import { getInstructorCourses } from '../api/instructor.api';
import { isApiError } from '../../../lib/axios';

interface UseInstructorCoursesResult {
  courses: InstructorCourse[];
  isEmpty: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useInstructorCourses = (): UseInstructorCoursesResult => {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsEmpty(false);

        const data = await getInstructorCourses();

        if (isMounted) {
          setCourses(data);
          setIsEmpty(data.length === 0);
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        if (isApiError(err)) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while fetching your courses.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return { courses, isEmpty, isLoading, error };
};
