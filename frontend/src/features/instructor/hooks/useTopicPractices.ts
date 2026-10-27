import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getPracticesByTopic } from '../api/practice.api';
import type { Practice } from '../types/practice.types';
import { isApiError } from '../../../lib/axios';

interface UseTopicPracticesResult {
  practices: Practice[];
  setPractices: Dispatch<SetStateAction<Practice[]>>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTopicPractices = (topicId: string): UseTopicPracticesResult => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!topicId) {
      setPractices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getPracticesByTopic(topicId);
      setPractices(result);
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : 'We could not load practices for this topic. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { practices, setPractices, isLoading, error, refetch };
};
