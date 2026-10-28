import { useCallback, useEffect, useState } from 'react';
import { isApiError } from '../../../lib/axios';
import {
  getPracticeAttempt,
  savePracticeAnswer,
  submitPracticeAttempt,
} from '../api/practiceAttempt.api';
import type {
  PracticeAttempt,
  PracticeQuestionSnapshot,
  SubmitPracticeAttemptPayload,
} from '../types/practiceAttempt.types';

interface UsePracticeSessionResult {
  attempt: PracticeAttempt | null;
  currentQuestionIndex: number;
  currentQuestion: PracticeQuestionSnapshot | null;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  isLoading: boolean;
  isSavingAnswer: boolean;
  isSubmitting: boolean;
  pendingQuestionSaveId: string | null;
  error: string | null;
  errorCode: string | null;
  isSubmitted: boolean;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  handleSaveAnswer: (
    questionId: string,
    answer: string | string[] | null,
  ) => Promise<boolean>;
  handleSubmit: (payload?: SubmitPracticeAttemptPayload) => Promise<boolean>;
  refetchAttempt: () => Promise<void>;
}

export function usePracticeSession(attemptId?: string): UsePracticeSessionResult {
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuestionSaveId, setPendingQuestionSaveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchAttempt = useCallback(async () => {
    if (!attemptId) {
      setError('Attempt ID is required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const data = await getPracticeAttempt(attemptId);
      setAttempt(data);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setError(err.message);
      } else {
        setError('Failed to load practice attempt.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    let cancelled = false;
    if (!attemptId) return;

    fetchAttempt().catch(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [fetchAttempt, attemptId]);

  const questions = attempt?.questions ?? [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex] ?? null;

  // Count answered questions (where answer is defined and not null)
  const answeredCount = questions.filter(
    (q) => q.answer !== undefined && q.answer !== null,
  ).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isSubmitted = attempt?.status === 'SUBMITTED';

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSaveAnswer = async (
    questionId: string,
    answer: string | string[] | null,
  ): Promise<boolean> => {
    if (!attemptId || isSavingAnswer || isSubmitted) return false;

    setIsSavingAnswer(true);
    setPendingQuestionSaveId(questionId);
    setError(null);
    setErrorCode(null);

    try {
      const updatedAttempt = await savePracticeAnswer(
        attemptId,
        questionId,
        answer,
      );
      setAttempt(updatedAttempt);
      return true;
    } catch (err: unknown) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setError(err.message);

        // Concurrency or lifecycle conflict recovery
        if (err.code === 'ATTEMPT_CHANGED') {
          // Re-fetch authoritative attempt to reconcile state safely
          try {
            const fresh = await getPracticeAttempt(attemptId);
            setAttempt(fresh);
            setError('This attempt was updated in another window. Your view has been refreshed.');
          } catch {
            // Keep error as is
          }
        } else if (err.code === 'ATTEMPT_NOT_IN_PROGRESS') {
          // Attempt was finalized
          try {
            const fresh = await getPracticeAttempt(attemptId);
            setAttempt(fresh);
          } catch {
            // Keep error as is
          }
        }
      } else {
        setError('Failed to save your answer. Please check your connection.');
      }
      return false;
    } finally {
      setIsSavingAnswer(false);
      setPendingQuestionSaveId(null);
    }
  };

  const handleSubmit = async (
    payload?: SubmitPracticeAttemptPayload,
  ): Promise<boolean> => {
    if (!attemptId || isSubmitting || isSavingAnswer) return false;

    setIsSubmitting(true);
    setError(null);
    setErrorCode(null);

    try {
      const finalized = await submitPracticeAttempt(attemptId, payload);
      setAttempt(finalized);
      return true;
    } catch (err: unknown) {
      if (isApiError(err)) {
        setErrorCode(err.code);
        setError(err.message);

        if (err.code === 'ATTEMPT_CHANGED') {
          try {
            const fresh = await getPracticeAttempt(attemptId);
            setAttempt(fresh);
          } catch {
            // Keep error as is
          }
        }
      } else {
        setError('Failed to submit practice attempt. Please try again.');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    attempt,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    unansweredCount,
    isLoading,
    isSavingAnswer,
    isSubmitting,
    pendingQuestionSaveId,
    error,
    errorCode,
    isSubmitted,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    handleSaveAnswer,
    handleSubmit,
    refetchAttempt: fetchAttempt,
  };
}
