import { useState, useEffect } from 'react';
import type { LearnerDashboardData } from '../types/learner.types';
import { getLearnerDashboard } from '../api/learner.api';
import { isApiError } from '../../../lib/axios';

export function useLearnerDashboard() {
  const [data, setData] = useState<LearnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    
    getLearnerDashboard()
      .then((dashboardData) => {
        if (!cancelled) {
          setData(dashboardData);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (isApiError(err)) {
            setError(err.message || 'Failed to load dashboard data.');
          } else {
            setError('An unexpected error occurred.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
