import { useState, useEffect, useCallback } from 'react';
import { getMyEnrollments, enrollInCourse, withdrawEnrollment } from '../api/enrollment.api';
import { getCourseDetail } from '../api/course.api';
import { getLearnerCourseProgress } from '../api/learner.api';
import type { EnrollmentRecord } from '../types/enrollment.types';
import type { LearnerCourseItem } from '../types/course.types';
import type { LearnerCourseProgressDetail } from '../types/learner.types';

export interface EnrolledCourseCardData {
  enrollment: EnrollmentRecord;
  course: LearnerCourseItem | null;
}

export function useMyEnrollments(options: { includeProgress?: boolean } = {}) {
  const includeProgress = options.includeProgress ?? false;
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, LearnerCourseItem>>({});
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, LearnerCourseProgressDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyEnrollments();
      const records = Array.isArray(data) ? data : [];
      setEnrollments(records);

      // Fetch course details for enrolled courses
      const courseIds = [...new Set(records.map((r) => r.courseId))];
      const coursePromises = courseIds.map(async (id) => {
        try {
          const detail = await getCourseDetail(id);
          return { id, detail };
        } catch {
          return { id, detail: null };
        }
      });
      const activeCourseIds = includeProgress
        ? [...new Set(records.filter((record) => record.status === 'ACTIVE').map((record) => record.courseId))]
        : [];
      const progressPromises = activeCourseIds.map(async (id) => {
        try {
          const progress = await getLearnerCourseProgress(id);
          return { id, progress };
        } catch {
          // Course cards remain usable if an individual progress request fails.
          return { id, progress: null };
        }
      });
      const [results, progressResults] = await Promise.all([
        Promise.all(coursePromises),
        Promise.all(progressPromises),
      ]);
      const map: Record<string, LearnerCourseItem> = {};
      results.forEach((r) => {
        if (r.detail) map[r.id] = r.detail;
      });
      setCoursesMap(map);
      const progressMap: Record<string, LearnerCourseProgressDetail> = {};
      progressResults.forEach((result) => {
        if (result.progress) progressMap[result.id] = result.progress;
      });
      setCourseProgressMap(progressMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [includeProgress]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleEnroll = async (courseId: string) => {
    const newEnrollment = await enrollInCourse(courseId);
    await fetchEnrollments();
    return newEnrollment;
  };

  const handleWithdraw = async (enrollmentId: string) => {
    const result = await withdrawEnrollment(enrollmentId);
    await fetchEnrollments();
    return result;
  };

  return {
    enrollments,
    coursesMap,
    courseProgressMap,
    loading,
    error,
    refresh: fetchEnrollments,
    handleEnroll,
    handleWithdraw,
  };
}
