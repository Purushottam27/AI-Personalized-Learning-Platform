import { useCallback, useEffect, useState } from 'react';
import { isApiError } from '../../../lib/axios';
import { getInstructorLearnersOverview } from '../api/learners-overview.api';
import type {
  InstructorLearnersOverviewQuery,
  InstructorLearnersOverviewResponse,
} from '../types/learners-overview.types';

interface UseInstructorLearnersOverviewResult {
  data: InstructorLearnersOverviewResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstructorLearnersOverview = (
  query: InstructorLearnersOverviewQuery
): UseInstructorLearnersOverviewResult => {
  const [data, setData] = useState<InstructorLearnersOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getInstructorLearnersOverview(query));
    } catch (err: unknown) {
      setError(isApiError(err) ? err.message : 'Unable to load the all-courses learner overview.');
    } finally {
      setIsLoading(false);
    }
  }, [query.page, query.limit, query.search]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getInstructorLearnersOverview(query)
      .then((result) => { if (active) setData(result); })
      .catch((err: unknown) => {
        if (active) setError(isApiError(err) ? err.message : 'Unable to load the all-courses learner overview.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [query.page, query.limit, query.search]);

  return { data, isLoading, error, refetch };
};
