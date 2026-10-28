import api from '../../../lib/axios';
import type { AssessmentAttempt } from '../types/assessmentAttempt.types';

export async function startAssessmentAttempt(assessmentId: string): Promise<AssessmentAttempt> {
  const response = await api.post<{ data: AssessmentAttempt }>(`/assessments/${assessmentId}/attempts`);
  return response.data.data;
}

export async function getAssessmentAttempt(attemptId: string): Promise<AssessmentAttempt> {
  const response = await api.get<{ data: AssessmentAttempt }>(`/assessment-attempts/${attemptId}`);
  return response.data.data;
}

export async function saveAssessmentAnswer(
  attemptId: string,
  questionId: string,
  answer: string | string[] | null
): Promise<void> {
  await api.put(`/assessment-attempts/${attemptId}/questions/${questionId}/answer`, { answer });
}

export async function submitAssessmentAttempt(
  attemptId: string,
  reason: 'MANUAL' | 'LEFT' = 'MANUAL'
): Promise<AssessmentAttempt> {
  const response = await api.post<{ data: AssessmentAttempt }>(
    `/assessment-attempts/${attemptId}/submit`,
    { reason }
  );
  return response.data.data;
}

export async function getAssessmentAttemptHistory(
  assessmentId: string
): Promise<AssessmentAttempt[]> {
  const response = await api.get<{ data: AssessmentAttempt[] }>(
    `/assessments/${assessmentId}/attempts`
  );
  return response.data.data;
}
