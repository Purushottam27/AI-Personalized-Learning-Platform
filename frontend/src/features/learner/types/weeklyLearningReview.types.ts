export interface ReviewPerformance {
  sessions: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracyPercent: number | null;
  averageScorePercent: number | null;
  passedAssessments: number;
  failedAssessments: number;
  assessmentSubtypes: { DIAGNOSTIC: number; TOPIC: number; FINAL: number };
}

export interface WeeklyReviewActivity {
  activityId: string;
  activityType: string;
  title: string;
  scheduledDate: string;
  temporalStatus: 'PAST' | 'TODAY' | 'UPCOMING';
  completionStatus: 'COMPLETED' | 'SUBMITTED_NOT_PASSED' | 'PENDING' | 'NOT_TRACKED';
  isCompleted: boolean;
  isTrackable: boolean;
  courseId: string;
  topicId: string | null;
  topicTitle: string | null;
}

export interface WeeklyLearningReview {
  plan: { planId: string; version: number; status: string; startDate: string; endDate: string; timeZone: string };
  learningWeek: {
    scheduledActivities: number;
    completedActivities: number;
    pendingActivities: number;
    overdueActivities: number;
    activeLearningDays: number;
    completionPercentage?: number;
    activities?: WeeklyReviewActivity[];
  };
  performance: {
    practice: ReviewPerformance;
    assessments: ReviewPerformance;
    combined: ReviewPerformance;
    hasEvidence: boolean;
  };
  topicUnderstanding: {
    topics: Array<{
      courseId: string;
      topicId: string;
      topicTitle: string;
      masteryScore: number | null;
      status: string;
      confidence: number | null;
      evidenceCount: number;
      questionsAttempted: number;
      questionsCorrect: number;
      hasSufficientEvidence: boolean;
    }>;
    evidenceCount: number;
    hasSufficientEvidence: boolean;
    calculation?: string;
  };
  attentionItems: Array<{ type: string; count: number; message: string }>;
  nextSteps: Array<{ type: string; title: string; reason: string; courseId?: string; topicId?: string; activityId?: string }>;
  comparison: {
    available: boolean;
    currentPeriod: { startDate: string; endDate: string; performance: ReviewPerformance };
    previousPeriod: { startDate: string; endDate: string; performance: ReviewPerformance } | null;
    reason: string | null;
  };
}
