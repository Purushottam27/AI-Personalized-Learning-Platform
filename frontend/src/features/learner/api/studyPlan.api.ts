import api from '../../../lib/axios';
import type {
  StudyPlan,
  StudyPreferences,
  PlanHistoryItem,
  ProposedPlanRevision,
  ChatMessage,
  ChatReplyResponse,
  StudyPlanQuota,
} from '../types/studyPlan.types';

export const getStudyPreferences = async (): Promise<StudyPreferences> => {
  const res = await api.get<{ data: StudyPreferences }>('/learning/me/study-preferences');
  return res.data.data;
};

export const updateStudyPreferences = async (updates: Partial<StudyPreferences>): Promise<StudyPreferences> => {
  const res = await api.patch<{ data: StudyPreferences }>('/learning/me/study-preferences', updates);
  return res.data.data;
};

export const getActiveStudyPlan = async (): Promise<StudyPlan> => {
  const res = await api.get<{ data: { plan: StudyPlan } }>('/learning/me/study-plan');
  return res.data.data.plan;
};

export const generateStudyPlan = async (revisionReason?: string): Promise<StudyPlan> => {
  const res = await api.post<{ data: { plan: StudyPlan } }>('/learning/me/study-plan/generate', { revisionReason });
  return res.data.data.plan;
};

export const getStudyPlanQuota = async (): Promise<StudyPlanQuota> => {
  const res = await api.get<{ data: StudyPlanQuota }>('/learning/me/study-plan/quota');
  return res.data.data;
};

export const getStudyPlanHistory = async (): Promise<PlanHistoryItem[]> => {
  const res = await api.get<{ data: PlanHistoryItem[] }>('/learning/me/study-plan/history');
  return res.data.data;
};

export const proposePlanRevision = async (reason?: string): Promise<ProposedPlanRevision> => {
  const res = await api.post<{ data: ProposedPlanRevision }>('/learning/me/study-plan/propose-revision', { reason });
  return res.data.data;
};

export const acceptPlanRevision = async (revisionData: ProposedPlanRevision): Promise<StudyPlan> => {
  const payload = revisionData.proposalId
    ? { proposalId: revisionData.proposalId }
    : revisionData;
  const res = await api.post<{ data: { plan: StudyPlan } }>('/learning/me/study-plan/accept-revision', payload);
  return res.data.data.plan;
};

export const chatWithAssistant = async (message: string, activityId?: string): Promise<ChatReplyResponse> => {
  const res = await api.post<{ data: ChatReplyResponse }>('/learning/me/study-assistant/chat', {
    message,
    activityId,
  });
  return res.data.data;
};

export const getAssistantMessages = async (): Promise<ChatMessage[]> => {
  const res = await api.get<{ data: ChatMessage[] }>('/learning/me/study-assistant/messages');
  return res.data.data;
};

