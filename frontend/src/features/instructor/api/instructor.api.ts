import api from '../../../lib/axios';
import type { InstructorCourse, Course, CreateCoursePayload } from '../types/instructor.types';

/** GET /api/v1/courses/instructor/courses — list instructor's own courses */
export const getInstructorCourses = async (): Promise<InstructorCourse[]> => {
  const response = await api.get<{ data: InstructorCourse[] }>('/courses/instructor/courses');
  return response.data.data;
};

/** POST /api/v1/courses — create a new DRAFT course */
export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
  const response = await api.post<{ data: Course }>('/courses', payload);
  return response.data.data;
};

/** PATCH /api/v1/courses/:courseId — update an existing course */
export const updateCourse = async (courseId: string, payload: Partial<CreateCoursePayload>): Promise<Course> => {
  const response = await api.patch<{ data: Course }>(`/courses/${courseId}`, payload);
  return response.data.data;
};

/** GET /api/v1/courses/:courseId — fetch a single course by ID */
export const getCourseById = async (courseId: string): Promise<Course> => {
  const response = await api.get<{ data: Course }>(`/courses/${courseId}`);
  return response.data.data;
};

