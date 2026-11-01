import type { LearnerCourseProgressDetail } from '../types/learner.types';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Build the canonical learner workspace URL used by Dashboard and My Courses. */
export function getCourseWorkspacePath(courseId: string, topicId?: string | null): string {
  const basePath = `/learner/courses/${courseId}/learn`;
  return topicId && OBJECT_ID_PATTERN.test(topicId)
    ? `${basePath}?topicId=${encodeURIComponent(topicId)}`
    : basePath;
}

/**
 * Match the dashboard's server-side resume rule: open the first topic that has
 * not yet reached STRONG or MASTERED status. Topic order is supplied by the API.
 */
export function getResumeTopicId(progress?: LearnerCourseProgressDetail | null): string | null {
  if (!progress?.topics?.length) return null;
  const nextTopic = progress.topics.find(
    (topic) => topic.status !== 'STRONG' && topic.status !== 'MASTERED',
  );
  return nextTopic?.topicId || null;
}
