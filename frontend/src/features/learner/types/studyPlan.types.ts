export type ActivityType = 'LESSON' | 'PRACTICE' | 'ASSESSMENT' | 'RESOURCE' | 'TOPIC_REVIEW' | 'COURSE_DISCOVERY';
export type ActivityStatus = 'PENDING' | 'COMPLETED' | 'SUBMITTED_NOT_PASSED';
export type DayState = 'PAST' | 'TODAY' | 'UPCOMING';

export interface ScheduledActivity {
  activityId: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  scheduledDate: string;
  activityType: ActivityType;
  title: string;
  courseId: string;
  courseTitle: string;
  topicId?: string | null;
  topicTitle?: string | null;
  targetId?: string | null;
  estimatedDurationMinutes: number;
  rationale: string;
  actionUrl: string;
  order: number;
  actualStatus?: ActivityStatus;
  temporalStatus?: DayState;
  isCompleted?: boolean;
  isToday?: boolean;
  isUntrackedCompletion?: boolean;
  durationAllocationType?: 'ESTIMATED' | 'PLANNING_ALLOCATION';
}
export interface StudyPlanWeekDay {
  dayOfWeek: ScheduledActivity['dayOfWeek'];
  date: string;
  dayState: DayState;
  isToday: boolean;
  activities: ScheduledActivity[];
  activityCount: number;
  completedCount: number;
  pendingCount: number;
  totalDurationMinutes: number;
  isRestDay: boolean;
}
export interface StudyPreferences {
  dailyStudyTime: string | null;
  preferredLearningFormat: string[];
  studyDays: string[];
  preferredSessionDuration: number;
  preferredTimeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANYTIME';
}
export interface PlanSummary {
  totalScheduled: number;
  completedCount: number;
  pendingCount: number;
  missedCount: number;
  overdueCount?: number;
  progressPercentage: number;
}
export interface StudyPlan {
  _id: string;
  learnerId: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  preferencesSnapshot: StudyPreferences;
  scheduledActivities: ScheduledActivity[];
  weekDays: StudyPlanWeekDay[];
  todayDate: string;
  topicInsights?: Array<{
    topicId: string;
    courseId: string;
    masteryScore: number | null;
    status: string;
    confidence: number | null;
    evidenceCount: number | null;
  }>;
  generationSource: 'AI_ASSISTED' | 'DETERMINISTIC_FALLBACK';
  revisionReason?: string | null;
  previousPlanId?: string | null;
  summary: PlanSummary;
  todayActivities: ScheduledActivity[];
  nextActivity: ScheduledActivity | null;
  createdAt: string;
  updatedAt: string;
}
export interface PlanHistoryItem {
  planId: string;
  version: number;
  status: string;
  startDate: string;
  endDate: string;
  totalActivities: number;
  revisionReason?: string | null;
  createdAt: string;
}
export interface StudyPlanQuota {
  dateKey: string;
  count: number;
  remaining: number;
  maxAllowed: number;
  resetAt: string;
  timeZone?: string;
}
export interface ProposedPlanRevision {
  proposalId?: string;
  isRevisionRecommended: boolean;
  proposedVersion: number;
  startDate: string;
  endDate: string;
  reason: string;
  proposedActivities: ScheduledActivity[];
  preferencesSnapshot: StudyPreferences;
  expiresAt?: string;
}
