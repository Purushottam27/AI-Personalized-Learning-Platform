import { useState, useEffect, useCallback } from 'react';
import type {
  StudyPlan,
  StudyPreferences,
  PlanHistoryItem,
  ProposedPlanRevision,
  ChatMessage,
  StudyPlanQuota,
} from '../types/studyPlan.types';
import * as api from '../api/studyPlan.api';
import { isApiError } from '../../../lib/axios';

export const useStudyPlan = () => {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [preferences, setPreferences] = useState<StudyPreferences | null>(null);
  const [quota, setQuota] = useState<StudyPlanQuota | null>(null);
  const [history, setHistory] = useState<PlanHistoryItem[]>([]);
  const [proposedRevision, setProposedRevision] = useState<ProposedPlanRevision | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planData, prefData, quotaData, historyData, messagesData] = await Promise.all([
        api.getActiveStudyPlan(),
        api.getStudyPreferences(),
        api.getStudyPlanQuota().catch(() => null),
        api.getStudyPlanHistory(),
        api.getAssistantMessages(),
      ]);

      setPlan(planData);
      setPreferences(prefData);
      setQuota(quotaData);
      setHistory(historyData);
      setMessages(messagesData);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError('Failed to load study plan and assistant. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePreferences = async (updates: Partial<StudyPreferences>) => {
    try {
      const updated = await api.updateStudyPreferences(updates);
      setPreferences(updated);
      return updated;
    } catch (err: unknown) {
      if (isApiError(err)) throw new Error(err.message);
      throw new Error('Failed to update study preferences');
    }
  };

  const handleGeneratePlan = async (reason?: string) => {
    setIsLoading(true);
    try {
      const newPlan = await api.generateStudyPlan(reason);
      setPlan(newPlan);
      const [updatedHistory, updatedQuota] = await Promise.all([
        api.getStudyPlanHistory(),
        api.getStudyPlanQuota().catch(() => null),
      ]);
      setHistory(updatedHistory);
      if (updatedQuota) setQuota(updatedQuota);
      return newPlan;
    } catch (err: unknown) {
      if (isApiError(err)) throw new Error(err.message);
      throw new Error('Failed to generate study plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeRevision = async (reason?: string) => {
    try {
      const proposal = await api.proposePlanRevision(reason);
      setProposedRevision(proposal);
      return proposal;
    } catch (err: unknown) {
      if (isApiError(err)) throw new Error(err.message);
      throw new Error('Failed to evaluate plan revision');
    }
  };

  const handleAcceptRevision = async () => {
    if (!proposedRevision) return;
    setIsLoading(true);
    try {
      const accepted = await api.acceptPlanRevision(proposedRevision);
      setPlan(accepted);
      setProposedRevision(null);
      const updatedHistory = await api.getStudyPlanHistory();
      setHistory(updatedHistory);
      return accepted;
    } catch (err: unknown) {
      if (isApiError(err)) throw new Error(err.message);
      throw new Error('Failed to accept plan revision');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, activityId?: string) => {
    if (!text.trim()) return;
    setIsSendingMessage(true);
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      metadata: { referencedActivityId: activityId || null },
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.chatWithAssistant(text, activityId);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        metadata: {
          referencedActivityId: res.referencedActivity?.activityId || null,
          fallbackUsed: res.fallbackUsed,
        },
        timestamp: res.timestamp,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now, but your scheduled learning focus remains active. Please try asking again in a moment!",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return {
    plan,
    preferences,
    quota,
    history,
    proposedRevision,
    setProposedRevision,
    messages,
    isLoading,
    isSendingMessage,
    error,
    refetch: fetchData,
    updatePreferences: handleUpdatePreferences,
    generatePlan: handleGeneratePlan,
    proposeRevision: handleProposeRevision,
    acceptRevision: handleAcceptRevision,
    sendMessage: handleSendMessage,
  };
};

