export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';

export interface EnrollmentRecord {
  _id: string;
  learnerId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  withdrawnAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentWithCourse extends EnrollmentRecord {
  course?: {
    _id: string;
    title: string;
    description: string;
    domain: string;
    category: string;
    difficulty: string;
  };
}
