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
  needsImprovementCount: number;
  needsImprovementPercentage: number;
  masteryDistribution: MasteryDistribution;
}

export interface LearnerTopicPerformance {
  topicId: string;
  title: string;
  order: number;
  status: 'STRONG' | 'MASTERED' | 'FUNCTIONAL' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT' | 'INSUFFICIENT_EVIDENCE';
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
  hasNeedsImprovementEvidence: boolean;
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
    learnersWithNeedsImprovementCount: number;
    learnersNeedingAttentionCount?: number;
    learnersAwaitingEvidenceCount: number;
  };
  topicsPerformance: TopicPerformanceSummary[];
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

export interface ScoreDistribution {
  range0To49: number;
  range50To69: number;
  range70To84: number;
  range85To100: number;
}

export interface AssessmentPerformanceSummary {
  assessmentId: string;
  title: string;
  type: 'TOPIC' | 'DIAGNOSTIC' | 'FINAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  topicId: string | null;
  topicTitle: string | null;
  topicOrder: number | null;
  passingScore: number;
  questionsPerAttempt: number;
  totalPoolQuestions: number;
  totalAttempts: number;
  uniqueLearnersCount: number;
  inProgressAttemptsCount: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number | null;
  failPercentage: number | null;
  averageScore: number | null;
  participationRate: number | null;
  completionRate: number | null;
  scoreDistribution: ScoreDistribution;
  hasSufficientData: boolean;
}

export interface ActionableInsight {
  id: string;
  category: 'PERFORMANCE' | 'COMPLETION' | 'CURRICULUM_ALIGNMENT' | 'DATA_LIMITATION' | 'QUESTION_PERFORMANCE';
  title: string;
  observation: string;
  supportingEvidence: string;
  reference: {
    type: 'ASSESSMENT' | 'QUESTION' | 'TOPIC';
    id: string;
    title?: string;
    assessmentType?: string;
    topicId?: string | null;
    questionText?: string;
    assessmentId?: string;
  };
  suggestedAction: string;
  dataLimitationNotice?: string;
}

export interface InstructorAssessmentAnalyticsResponse {
  courseId: string;
  courseTitle: string;
  totalEnrolledLearners: number;
  totalAssessmentsCount: number;
  totalSubmittedAttempts: number;
  assessments: AssessmentPerformanceSummary[];
  insights: ActionableInsight[];
}

export interface QuestionPerformanceItem {
  questionId: string;
  questionText: string;
  type: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE';
  configuredDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  totalExposures: number;
  eligibleResponsesCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  correctPercentage: number | null;
  incorrectPercentage: number | null;
  unansweredPercentage: number | null;
  responsePatternSignal: 'NORMAL' | 'HIGH_ACCURACY' | 'HIGH_INCORRECT_RATE' | 'HIGH_UNANSWERED_RATE' | 'INSUFFICIENT_DATA';
  hasSufficientData: boolean;
}

export interface InstructorQuestionAnalyticsResponse {
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  passingScore: number;
  totalPoolQuestions: number;
  totalCompletedAttempts: number;
  questions: QuestionPerformanceItem[];
  questionInsights: ActionableInsight[];
}


