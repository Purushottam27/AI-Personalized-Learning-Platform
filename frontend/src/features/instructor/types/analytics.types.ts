export interface MasteryDistributionItem {
  count: number;
  percentage: number;
}

export interface MasteryDistribution {
  STRONG: MasteryDistributionItem;
  DEVELOPING: MasteryDistributionItem;
  NEEDS_IMPROVEMENT: MasteryDistributionItem;
  INSUFFICIENT_EVIDENCE: MasteryDistributionItem;
}

export interface TopicPerformanceSummary {
  topicId: string;
  title: string;
  order: number;
  totalEnrolled: number;
  evaluatedLearnersCount: number;
  averageMasteryScore: number | null;
  masteryDistribution: MasteryDistribution;
  isWeak: boolean;
  needsImprovementCount: number;
}

export interface WeakTopicSummary {
  topicId: string;
  title: string;
  order: number;
  needsImprovementCount: number;
  evaluatedLearnersCount: number;
  weaknessPercentage: number;
  averageMasteryScore: number | null;
}

export interface LearnerTopicPerformance {
  topicId: string;
  title: string;
  order: number;
  status: 'STRONG' | 'MASTERED' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT' | 'INSUFFICIENT_EVIDENCE';
  masteryScore: number | null;
  confidence: number;
  evidenceCount: number;
}

export interface LearnerPerformanceItem {
  learnerId: string;
  name: string;
  email: string;
  avatar: string | null;
  enrollmentStatus: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';
  enrolledAt: string;
  completedAt: string | null;
  lastActiveAt: string | null;
  totalEligibleAttempts: number;
  totalEvidenceCount: number;
  averageMasteryScore: number | null;
  progressPercentage: number;
  masteredTopicsCount: number;
  developingTopicsCount: number;
  needsImprovementTopicsCount: number;
  insufficientEvidenceTopicsCount: number;
  needsAttention: boolean;
  isAwaitingEvidence: boolean;
  topics: LearnerTopicPerformance[];
}

export interface InstructorCourseAnalytics {
  course: {
    courseId: string;
    title: string;
    status: string;
    domain: string;
    category: string;
    difficulty: string;
    totalTopicsCount: number;
  };
  overview: {
    totalEnrolledLearners: number;
    enrollmentBreakdown: {
      active: number;
      completed: number;
      withdrawn: number;
    };
    activeLearners: {
      totalActiveAllTime: number;
      activeLast7Days: number;
      activeLast30Days: number;
    };
    totalEligibleAttempts: number;
    overallAverageAccuracy: number | null;
    weakTopicsCount: number;
    learnersNeedingAttentionCount: number;
    learnersAwaitingEvidenceCount: number;
  };
  topicsPerformance: TopicPerformanceSummary[];
  weakTopics: WeakTopicSummary[];
  learners: {
    items: LearnerPerformanceItem[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

export interface InstructorAnalyticsQuery {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'ALL';
  search?: string;
}

