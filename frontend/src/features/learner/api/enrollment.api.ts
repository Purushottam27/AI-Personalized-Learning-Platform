import api from '../../../lib/axios';
import type { EnrollmentRecord } from '../types/enrollment.types';

export async function enrollInCourse(courseId: string): Promise<EnrollmentRecord> {
  const response = await api.post<{ data: EnrollmentRecord }>(`/courses/${courseId}/enroll`);
  return response.data.data;
}

export async function getMyEnrollments(): Promise<EnrollmentRecord[]> {
  const response = await api.get<{ data: EnrollmentRecord[] }>('/users/me/enrollments');
  return response.data.data;
}

export async function getEnrollmentById(enrollmentId: string): Promise<EnrollmentRecord> {
  const response = await api.get<{ data: EnrollmentRecord }>(`/enrollments/${enrollmentId}`);
  return response.data.data;
}

export async function withdrawEnrollment(enrollmentId: string): Promise<EnrollmentRecord> {
  const response = await api.post<{ data: EnrollmentRecord }>(`/enrollments/${enrollmentId}/withdraw`);
  return response.data.data;
}
