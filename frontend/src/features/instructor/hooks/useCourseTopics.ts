import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getTopicsByCourse } from '../api/topic.api';
import type { Topic } from '../types/topic.types';
import { isApiError } from '../../../lib/axios';

interface UseCourseTopicsResult {
  topics: Topic[];
  setTopics: Dispatch<SetStateAction<Topic[]>>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCourseTopics = (courseId: string): UseCourseTopicsResult => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTopicsByCourse(courseId);
      setTopics([...result].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : 'We could not load this course’s topics. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { topics, setTopics, isLoading, error, refetch };
};
