import api from '../../../lib/axios';
import type {
  Assessment,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
} from '../types/assessment.types';

export async function createAssessment(payload: CreateAssessmentPayload): Promise<Assessment> {
  const response = await api.post<{ data: Assessment }>('/assessments', payload);
  return response.data.data;
}

export async function getAssessmentsByTopic(topicId: string): Promise<Assessment[]> {
  const response = await api.get<{ data: Assessment[] }>(`/topics/${topicId}/assessments`);
  return response.data.data;
}

export async function getAssessmentsByCourse(courseId: string): Promise<Assessment[]> {
  const response = await api.get<{ data: Assessment[] }>(`/courses/${courseId}/assessments`);
  return response.data.data;
}

export async function getAssessmentById(assessmentId: string): Promise<Assessment> {
  const response = await api.get<{ data: Assessment }>(`/assessments/${assessmentId}`);
  return response.data.data;
}

export async function updateAssessment(
  assessmentId: string,
  payload: UpdateAssessmentPayload
): Promise<Assessment> {
  const response = await api.patch<{ data: Assessment }>(`/assessments/${assessmentId}`, payload);
  return response.data.data;
}

export async function publishAssessment(assessmentId: string): Promise<Assessment> {
  const response = await api.post<{ data: Assessment }>(`/assessments/${assessmentId}/publish`);
  return response.data.data;
}

export async function archiveAssessment(assessmentId: string): Promise<Assessment> {
  const response = await api.post<{ data: Assessment }>(`/assessments/${assessmentId}/archive`);
  return response.data.data;
}

export async function restoreAssessment(assessmentId: string): Promise<Assessment> {
  const response = await api.post<{ data: Assessment }>(`/assessments/${assessmentId}/restore`);
  return response.data.data;
}
