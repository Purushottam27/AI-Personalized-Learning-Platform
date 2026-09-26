export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
  currentTopicTitle: string;
  currentTopicId: string;
}

export interface NextBestAction {
  type: 'CONTINUE_LESSON' | 'START_PRACTICE' | 'REVIEW_TOPIC' | 'TAKE_ASSESSMENT';
  title: string;
  description: string;
  targetId: string;
}

export interface LearningStrength {
  topicId: string;
  title: string;
}

export interface LearningWeakness {
  topicId: string;
  title: string;
}

export interface LearningSummaryData {
  weeklyStudyMinutes: number;
  topicsCompletedThisWeek: number;
  currentStreakDays: number;
}

export interface RecommendedCourse {
  courseId: string;
  title: string;
  description: string;
  reason?: string;
  level?: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'LESSON_COMPLETED' | 'PRACTICE_COMPLETED' | 'ASSESSMENT_PASSED' | 'COURSE_ENROLLED';
  title: string;
  date: string;
}

export interface LearnerDashboardData {
  continueLearning: CourseProgress | null;
  nextBestAction: NextBestAction | null;
  progress: CourseProgress | null;
  strengths: LearningStrength[];
  needsAttention: LearningWeakness[];
  summary: LearningSummaryData | null;
  recommendations: RecommendedCourse[];
  recentActivity: RecentActivityItem[];
}
