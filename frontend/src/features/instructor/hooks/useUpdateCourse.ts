/**
 * useUpdateCourse — manages the course update API call.
 *
 * Responsibilities:
 * - Wraps PATCH /api/v1/courses/:courseId
 * - Tracks submitting and error state
 * - Prevents duplicate submissions
 * - Returns the updated Course on success
 */
import { useState } from 'react';
import type { Course, CreateCoursePayload } from '../types/instructor.types';
import { updateCourse } from '../api/instructor.api';
import { isApiError } from '../../../lib/axios';

interface UseUpdateCourseResult {
  update: (courseId: string, payload: Partial<CreateCoursePayload>) => Promise<Course | null>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

export const useUpdateCourse = (): UseUpdateCourseResult => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (courseId: string, payload: Partial<CreateCoursePayload>): Promise<Course | null> => {
    if (isSubmitting) return null;

    setIsSubmitting(true);
    setError(null);

    try {
      const course = await updateCourse(courseId, payload);
      return course;
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message || "We couldn't update the course. Please try again.");
      } else {
        setError("We couldn't update the course. Please try again.");
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  return { update, isSubmitting, error, clearError };
};
