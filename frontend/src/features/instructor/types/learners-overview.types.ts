export type OverviewEnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';

export interface InstructorLearnersOverviewCourse {
  courseId: string;
  title: string;
  status: string;
  domain?: string;
  category?: string;
  difficulty?: string;
  totalEnrollments: number;
  enrollmentBreakdown: {
    active: number;
    completed: number;
    withdrawn: number;
  };
}

export interface InstructorLearnersOverviewCourseAssociation {
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  enrollmentStatus: OverviewEnrollmentStatus;
  enrolledAt: string | null;
  completedAt: string | null;
  withdrawnAt: string | null;
}

export interface InstructorLearnersOverviewLearner {
  learnerId: string;
  name: string;
  email: string;
  avatar: string | null;
  accountStatus: string;
  coursesCount: number;
  courses: InstructorLearnersOverviewCourseAssociation[];
}

export interface InstructorLearnersOverviewResponse {
  overview: {
    totalCourses: number;
    totalEnrollments: number;
    uniqueLearnersCount: number;
    enrollmentBreakdown: {
      active: number;
      completed: number;
      withdrawn: number;
    };
  };
  courses: InstructorLearnersOverviewCourse[];
  learners: {
    items: InstructorLearnersOverviewLearner[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

export interface InstructorLearnersOverviewQuery {
  page?: number;
  limit?: number;
  search?: string;
}
