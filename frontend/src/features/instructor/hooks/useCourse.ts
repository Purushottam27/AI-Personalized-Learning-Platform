/**
 * useCourse — fetches a single course by ID for the Course Workspace.
 *
 * Responsibilities:
 * - Wraps GET /api/v1/courses/:courseId
 * - Tracks loading / error / course state
 * - Handles 404 and 403 with professional messages
 */
import { useState, useEffect } from 'react';
import type { Course } from '../types/instructor.types';
import { getCourseById } from '../api/instructor.api';
import { isApiError } from '../../../lib/axios';

interface UseCourseResult {
  course: Course | null;
  isLoading: boolean;
  error: string | null;
}

export const useCourse = (courseId: string | undefined): UseCourseResult => {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('Invalid course reference.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchCourse = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCourseById(courseId);
        if (isMounted) setCourse(data);
      } catch (err: unknown) {
        if (!isMounted) return;

        if (isApiError(err)) {
          if (err.status === 404) {
            setError('This course could not be found.');
          } else if (err.status === 403 || err.status === 401) {
            setError("You're not authorized to access this course.");
          } else {
            setError('Failed to load the course. Please try again.');
          }
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCourse();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  return { course, isLoading, error };
};
