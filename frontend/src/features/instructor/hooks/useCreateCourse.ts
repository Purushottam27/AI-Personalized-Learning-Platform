/**
 * useCreateCourse — manages the course creation API call.
 *
 * Responsibilities:
 * - Wraps POST /api/v1/courses
 * - Tracks submitting and error state
 * - Prevents duplicate submissions
 * - Returns the created Course on success so the caller can navigate
 */
import { useState } from 'react';
import type { Course, CreateCoursePayload } from '../types/instructor.types';
import { createCourse } from '../api/instructor.api';
import { isApiError } from '../../../lib/axios';

interface UseCreateCourseResult {
  submit: (payload: CreateCoursePayload) => Promise<Course | null>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

export const useCreateCourse = (): UseCreateCourseResult => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (payload: CreateCoursePayload): Promise<Course | null> => {
    if (isSubmitting) return null;

    setIsSubmitting(true);
    setError(null);

    try {
      const course = await createCourse(payload);
      return course;
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message || "We couldn't create the course. Please try again.");
      } else {
        setError("We couldn't create the course. Please try again.");
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  return { submit, isSubmitting, error, clearError };
};
