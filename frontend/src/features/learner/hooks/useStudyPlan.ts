import { useState, useEffect, useCallback } from 'react';
import type { StudyPlan, StudyPreferences, PlanHistoryItem, ProposedPlanRevision, StudyPlanQuota } from '../types/studyPlan.types';
import * as api from '../api/studyPlan.api';
import { isApiError } from '../../../lib/axios';

export const useStudyPlan = () => {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [preferences, setPreferences] = useState<StudyPreferences | null>(null);
  const [quota, setQuota] = useState<StudyPlanQuota | null>(null);
  const [history, setHistory] = useState<PlanHistoryItem[]>([]);
  const [proposedRevision, setProposedRevision] = useState<ProposedPlanRevision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planData, prefData, quotaData, historyData] = await Promise.all([
        api.getActiveStudyPlan(),
        api.getStudyPreferences(),
        api.getStudyPlanQuota().catch(() => null),
        api.getStudyPlanHistory(),
      ]);
      setPlan(planData);
      setPreferences(prefData);
      setQuota(quotaData);
      setHistory(historyData);
    } catch (err: unknown) {
      setError(isApiError(err) ? err.message : 'Failed to load your study plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

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
      setHistory(await api.getStudyPlanHistory());
      return accepted;
    } catch (err: unknown) {
      if (isApiError(err)) throw new Error(err.message);
      throw new Error('Failed to accept plan revision');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    plan, preferences, quota, history, proposedRevision, setProposedRevision,
    isLoading, error, refetch: fetchData,
    updatePreferences: handleUpdatePreferences,
    generatePlan: handleGeneratePlan,
    proposeRevision: handleProposeRevision,
    acceptRevision: handleAcceptRevision,
  };
};
