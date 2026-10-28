import { useState, useEffect, useCallback } from 'react';
import { getCourseDetail, getCourseTopics } from '../api/course.api';
import { getMyEnrollments, enrollInCourse } from '../api/enrollment.api';
import type { LearnerCourseItem } from '../types/course.types';
import type { Topic } from '../../instructor/types/topic.types';
import type { EnrollmentRecord } from '../types/enrollment.types';

export function useCourseDetail(courseId?: string) {
  const [course, setCourse] = useState<LearnerCourseItem | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const [courseData, topicsData, enrollmentsData] = await Promise.all([
        getCourseDetail(courseId),
        getCourseTopics(courseId).catch(() => []),
        getMyEnrollments().catch(() => []),
      ]);

      setCourse(courseData);
      setTopics(Array.isArray(topicsData) ? topicsData : []);

      const activeEnrollment = Array.isArray(enrollmentsData)
        ? enrollmentsData.find((e) => e.courseId === courseId && e.status === 'ACTIVE')
        : null;
      setEnrollment(activeEnrollment || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const enroll = async () => {
    if (!courseId) return;
    try {
      setEnrolling(true);
      const newEnrollment = await enrollInCourse(courseId);
      setEnrollment(newEnrollment);
      return newEnrollment;
    } catch (err: any) {
      throw err;
    } finally {
      setEnrolling(false);
    }
  };

  return {
    course,
    topics,
    enrollment,
    isEnrolled: !!enrollment,
    loading,
    enrolling,
    error,
    refresh: fetchCourseData,
    enroll,
  };
}
