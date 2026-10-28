import { useCallback, useEffect, useState } from 'react';
import { isApiError } from '../../../lib/axios';
import {
  getLearnerPracticeById,
  getPracticeAttemptHistory,
  startPracticeAttempt,
} from '../api/practiceAttempt.api';
import type {
  LearnerPractice,
  PracticeAttempt,
  PracticeAttemptHistoryResponse,
  PracticeHistoryItem,
} from '../types/practiceAttempt.types';

interface UsePracticeOverviewResult {
  practice: LearnerPractice | null;
  history: PracticeAttemptHistoryResponse | null;
  activeAttempt: PracticeHistoryItem | null;
  isLoading: boolean;
  isStarting: boolean;
  error: string | null;
  errorCode: string | null;
  refetch: () => Promise<void>;
  handleStartAttempt: () => Promise<PracticeAttempt | null>;
}

export function usePracticeOverview(practiceId?: string): UsePracticeOverviewResult {
  const [practice, setPractice] = useState<LearnerPractice | null>(null);
  const [history, setHistory] = useState<PracticeAttemptHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!practiceId) {
      setError('Practice ID is required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const [practiceData, historyData] = await Promise.all([
        getLearnerPracticeById(practiceId),
        getPracticeAttemptHistory(practiceId).catch((err) => {
          // If history fetch fails with 404/403, we still want to show practice or error gracefully
          if (isApiError(err) && err.status === 404) {
            return null;
          }
          throw err;
        }),
      ]);

      setPractice(practiceData);
      setHistory(historyData);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setError(err.message);
      } else {
        setError('Failed to load practice details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [practiceId]);

  useEffect(() => {
    let cancelled = false;
    if (!practiceId) return;

    fetchOverview().catch(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [fetchOverview, practiceId]);

  // Find any attempt with status 'IN_PROGRESS'
  const activeAttempt =
    history?.attempts?.find((a) => a.status === 'IN_PROGRESS') ?? null;

  const handleStartAttempt = async (): Promise<PracticeAttempt | null> => {
    if (!practiceId) return null;

    setIsStarting(true);
    setError(null);
    setErrorCode(null);

    try {
      const createdAttempt = await startPracticeAttempt(practiceId);
      return createdAttempt;
    } catch (err: unknown) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        if (err.code === 'ATTEMPT_ALREADY_IN_PROGRESS') {
          // Refresh history so active attempt is displayed for immediate resumption
          await fetchOverview();
          setError('You already have an attempt in progress. Click "Resume Attempt" to continue.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to start practice attempt. Please try again.');
      }
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  return {
    practice,
    history,
    activeAttempt,
    isLoading,
    isStarting,
    error,
    errorCode,
    refetch: fetchOverview,
    handleStartAttempt,
  };
}
