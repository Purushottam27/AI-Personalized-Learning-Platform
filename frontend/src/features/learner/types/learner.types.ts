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
  type: 'CONTINUE_LESSON' | 'START_PRACTICE' | 'REVIEW_TOPIC' | 'TAKE_ASSESSMENT' | 'EXPLORE_COURSE';
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

export interface TopicProgressItem {
  topicId: string;
  title: string;
  order: number;
  masteryScore: number | null;
  status: string;
  confidence: number;
  evidenceCount: number;
  practiceAttemptsCount: number;
  assessmentAttemptsCount: number;
  lastEvaluatedAt: string | null;
}

export interface LearnerCourseProgressDetail {
  courseId: string;
  courseTitle: string;
  domain?: string;
  category?: string;
  enrolledAt: string;
  totalTopics: number;
  evaluatedTopics: number;
  masteredTopics: number;
  progressPercentage: number;
  topics: TopicProgressItem[];
}

export interface ActivityTotals {
  activeCoursesCount: number;
  totalPracticesCompleted: number;
  totalAssessmentsCompleted: number;
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  overallAccuracy: number;
}

export interface MasteryDistribution {
  MASTERED: number;
  STRONG: number;
  FUNCTIONAL: number;
  DEVELOPING: number;
  NEEDS_IMPROVEMENT: number;
  INSUFFICIENT_EVIDENCE: number;
}

export interface DailyTrendItem {
  date: string;
  practiceCount: number;
  assessmentCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  averageScore: number;
}

export interface CourseProgressSummary {
  courseId: string;
  courseTitle: string;
  domain?: string;
  totalTopics: number;
  evaluatedTopics: number;
  masteredTopics: number;
  progressPercentage: number;
}

export interface LearnerAnalyticsOverviewData {
  activityTotals: ActivityTotals;
  masteryDistribution: MasteryDistribution;
  dailyTrends: DailyTrendItem[];
  courseProgressList: CourseProgressSummary[];
}

