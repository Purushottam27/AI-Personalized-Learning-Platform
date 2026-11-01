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
  courseId?: string;
  topicId?: string;
  targetType?: string;
  actionType?: string;
  isActionable?: boolean;
}

export interface LearningStrength {
  topicId: string;
  title: string;
}

export interface LearningWeakness {
  topicId: string;
  courseId?: string;
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
  courseId?: string;
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

export interface TopicMasteryAnalyticsItem {
  topicId: string;
  courseId: string;
  topicTitle: string;
  courseTitle: string;
  domain?: string;
  order: number;
  masteryScore: number | null;
  status: string;
  confidence: number;
  evidenceCount: number;
  practiceAttemptsCount: number;
  assessmentAttemptsCount: number;
  lastEvaluatedAt: string | null;
}

export interface AnalyticsPeriodSummary {
  attempts: number;
  practiceCount: number;
  assessmentCount: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyPercent: number | null;
}

export interface LearnerAnalyticsOverviewData {
  activityTotals: ActivityTotals;
  engagement: { accessedResources: number; activeResourcesAvailable: number; lessonsAvailable: number; note: string };
  masteryDistribution: MasteryDistribution;
  topicMasteryList: TopicMasteryAnalyticsItem[];
  periodComparison: {
    days: number;
    current: AnalyticsPeriodSummary;
    previous: AnalyticsPeriodSummary;
  };
  dailyTrends: DailyTrendItem[];
  courseProgressList: CourseProgressSummary[];
}

export interface LearnerCourseAnalyticsTopic {
  topicId: string;
  title: string;
  order: number;
  masteryScore: number | null;
  status: string;
  confidence: number;
  evidenceCount: number;
  practiceAttemptsCount: number;
  assessmentAttemptsCount: number;
  resourceAccessCount: number;
  isUnlocked: boolean;
  lastEvaluatedAt: string | null;
}

export interface LearnerCourseAnalyticsData {
  course: {
    courseId: string;
    title: string;
    domain?: string;
    category?: string;
    enrolledAt: string;
  };
  overview: {
    totalTopics: number;
    evaluatedTopics: number;
    masteredTopics: number;
    masteryCoveragePercent: number;
    masteredTopicPercent: number;
    totalLessonsAvailable: number;
    totalActiveResources: number;
    accessedResources: number;
    totalEligibleAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracyPercent: number | null;
  };
  masteryDistribution: Record<string, number>;
  topics: LearnerCourseAnalyticsTopic[];
  activity: {
    days: number;
    dailyTrends: DailyTrendItem[];
    currentPeriod: AnalyticsPeriodSummary;
    previousPeriod: AnalyticsPeriodSummary;
    resourceAccesses: number;
  };
  nextAction: {
    topicId: string;
    topicTitle: string;
    kind: 'GATHER_EVIDENCE' | 'REVIEW_TOPIC';
    explanation: string;
  } | null;
  evidenceGuidance: string;
}
