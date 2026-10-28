import { useState, useEffect, useCallback } from 'react';
import { getMyEnrollments, enrollInCourse, withdrawEnrollment } from '../api/enrollment.api';
import { getCourseDetail } from '../api/course.api';
import type { EnrollmentRecord } from '../types/enrollment.types';
import type { LearnerCourseItem } from '../types/course.types';

export interface EnrolledCourseCardData {
  enrollment: EnrollmentRecord;
  course: LearnerCourseItem | null;
}

export function useMyEnrollments() {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, LearnerCourseItem>>({});
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
      const results = await Promise.all(coursePromises);
      const map: Record<string, LearnerCourseItem> = {};
      results.forEach((r) => {
        if (r.detail) map[r.id] = r.detail;
      });
      setCoursesMap(map);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, []);

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
    loading,
    error,
    refresh: fetchEnrollments,
    handleEnroll,
    handleWithdraw,
  };
}
