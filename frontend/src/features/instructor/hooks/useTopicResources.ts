import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getResourcesByTopic } from '../api/resource.api';
import type { Resource } from '../types/resource.types';
import { isApiError } from '../../../lib/axios';

interface UseTopicResourcesResult {
  resources: Resource[];
  setResources: Dispatch<SetStateAction<Resource[]>>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTopicResources = (topicId: string): UseTopicResourcesResult => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!topicId) {
      setResources([]);
      setError('This topic link is incomplete.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await getResourcesByTopic(topicId);
      setResources([...result].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'We could not load resources for this topic. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getResourcesByTopic(topicId);
        if (active) setResources([...result].sort((a, b) => a.order - b.order));
      } catch (err: unknown) {
        if (active) {
          setError(
            isApiError(err)
              ? err.message
              : err instanceof Error
                ? err.message
                : 'We could not load resources for this topic. Please try again.',
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (topicId) void load();
    else {
      setResources([]);
      setError('This topic link is incomplete.');
      setIsLoading(false);
    }

    return () => { active = false; };
  }, [topicId]);

  return { resources, setResources, isLoading, error, refetch };
};
