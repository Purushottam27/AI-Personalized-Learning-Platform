import api from '../../../lib/axios';
import type {
  DiscoverCoursesQuery,
  DiscoverCoursesResponse,
  LearnerCourseItem,
} from '../types/course.types';
import type { Topic } from '../../instructor/types/topic.types';
import type { Lesson } from '../../instructor/types/lesson.types';
import type { Resource } from '../../instructor/types/resource.types';

export async function discoverCourses(query: DiscoverCoursesQuery = {}): Promise<DiscoverCoursesResponse> {
  const response = await api.get<{ data: DiscoverCoursesResponse }>('/courses', {
    params: query,
  });
  return response.data.data;
}

export async function getCourseDetail(courseId: string): Promise<LearnerCourseItem> {
  const response = await api.get<{ data: LearnerCourseItem }>(`/courses/${courseId}`);
  return response.data.data;
}

export async function getCourseTopics(courseId: string): Promise<Topic[]> {
  const response = await api.get<{ data: Topic[] }>(`/courses/${courseId}/topics`);
  return response.data.data;
}

export async function getTopicLessons(topicId: string): Promise<Lesson[]> {
  const response = await api.get<{ data: Lesson[] }>(`/topics/${topicId}/lessons`);
  return response.data.data;
}

export async function getTopicResources(topicId: string): Promise<Resource[]> {
  const response = await api.get<{ data: Resource[] }>(`/topics/${topicId}/resources`);
  return response.data.data;
}

export async function getCourseDiagnostic(courseId: string): Promise<any> {
  const response = await api.get<{ data: any }>(`/courses/${courseId}/diagnostic`);
  return response.data.data;
}
