export type RecommendationActionType =
  | 'REVIEW_LESSON'
  | 'ATTEMPT_PRACTICE'
  | 'REVIEW_TOPIC'
  | 'PROGRESS_TO_TOPIC'
  | 'EXPLORE_COURSE';

export type RecommendationTargetType = 'LESSON' | 'PRACTICE' | 'TOPIC' | 'COURSE';

export type RecommendationTier =
  | 'DEMONSTRATED_WEAKNESS'
  | 'DEVELOPING_MASTERY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'MASTERY_PROGRESSION'
  | 'MASTERED';

export interface LearnerCourseRecommendation {
  id: string;
  actionType: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  domain: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  targetId: string;
  targetType: 'COURSE';
  priority: number;
  matchedInterest?: string | null;
  reason: string;
  explanation: string;
  isActionable: boolean;
}

export interface LearnerRecommendationItem {
  id: string;
  actionType: RecommendationActionType;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  topicId: string;
  topicTitle: string;
  topicOrder: number;
  targetId: string;
  targetType: RecommendationTargetType;
  priority: number;
  tier: RecommendationTier;
  masteryScore: number;
  masteryStatus: string;
  confidence: number;
  reasonCode: string;
  explanation: string;
  isActionable: boolean;
}

export interface LearnerNextBestAction {
  type: RecommendationActionType;
  title: string;
  description: string;
  actionType: RecommendationActionType;
  courseId: string;
  topicId?: string;
  targetId: string;
  targetType: RecommendationTargetType;
  priority: number;
  score?: number;
  status?: string;
  reasonCode: string;
  explanation: string;
  isActionable: boolean;
}

export interface LearnerRecommendationsResponse {
  nextBestAction: LearnerNextBestAction | null;
  recommendations: LearnerRecommendationItem[];
  courseRecommendations?: LearnerCourseRecommendation[];
  totalCount: number;
}

