export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface InstructorCourse {
  _id: string;
  title: string;
  description?: string;
  status: CourseStatus;
  domain?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorCoursesResponse {
  success: boolean;
  data: InstructorCourse[];
}
