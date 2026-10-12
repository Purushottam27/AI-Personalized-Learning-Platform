import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getLessonsByTopic } from '../api/lesson.api';
import type { Lesson } from '../types/lesson.types';
import { isApiError } from '../../../lib/axios';

interface UseTopicLessonsResult {
  lessons: Lesson[];
  setLessons: Dispatch<SetStateAction<Lesson[]>>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTopicLessons = (topicId: string): UseTopicLessonsResult => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getLessonsByTopic(topicId);
      setLessons([...result].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : 'We could not load lessons for this topic. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { lessons, setLessons, isLoading, error, refetch };
};
