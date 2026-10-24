import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getQuestionBankByTopic } from '../api/questionBank.api';
import type { QuestionBank } from '../types/questionBank.types';
import { isApiError } from '../../../lib/axios';

interface UseTopicQuestionBankResult {
  bank: QuestionBank | null;
  setBank: Dispatch<SetStateAction<QuestionBank | null>>;
  hasBank: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTopicQuestionBank = (
  topicId: string,
): UseTopicQuestionBankResult => {
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [hasBank, setHasBank] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!topicId) {
      setBank(null);
      setHasBank(false);
      setError('This topic link is incomplete.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await getQuestionBankByTopic(topicId);
      setBank(result);
      setHasBank(true);
    } catch (err: unknown) {
      if (isApiError(err) && (err.status === 404 || err.code === 'QUESTION_BANK_NOT_FOUND')) {
        setBank(null);
        setHasBank(false);
        setError(null);
      } else {
        setError(
          isApiError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load question bank for this topic.',
        );
      }
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
        const result = await getQuestionBankByTopic(topicId);
        if (active) {
          setBank(result);
          setHasBank(true);
        }
      } catch (err: unknown) {
        if (active) {
          if (isApiError(err) && (err.status === 404 || err.code === 'QUESTION_BANK_NOT_FOUND')) {
            setBank(null);
            setHasBank(false);
            setError(null);
          } else {
            setError(
              isApiError(err)
                ? err.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to load question bank for this topic.',
            );
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (topicId) void load();
    else {
      setBank(null);
      setHasBank(false);
      setError('This topic link is incomplete.');
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [topicId]);

  return { bank, setBank, hasBank, isLoading, error, refetch };
};
