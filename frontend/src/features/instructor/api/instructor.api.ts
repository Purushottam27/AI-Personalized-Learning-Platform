import api from '../../../lib/axios';
import type { InstructorCourse } from '../types/instructor.types';

export const getInstructorCourses = async (): Promise<InstructorCourse[]> => {
  const response = await api.get<{ data: InstructorCourse[] }>('/courses/instructor/courses');
  return response.data.data;
};
