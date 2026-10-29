import { useState, useEffect, useCallback } from 'react';
import {
  getLearnerRecommendations,
  getLearnerCourseRecommendations,
} from '../api/recommendation.api';
import { getMyEnrollments } from '../api/enrollment.api';
import { getCourseDetail } from '../api/course.api';
import type {
  LearnerRecommendationItem,
  LearnerCourseRecommendation,
  LearnerNextBestAction,
  RecommendationTier,
} from '../types/recommendation.types';

export interface EnrolledCourseOption {
  courseId: string;
  title: string;
}

export function useLearnerRecommendations() {
  const [recommendations, setRecommendations] = useState<LearnerRecommendationItem[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<LearnerCourseRecommendation[]>([]);
  const [nextBestAction, setNextBestAction] = useState<LearnerNextBestAction | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseOption[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);

  // 1. Fetch active enrollments to populate the course filter dropdown
  useEffect(() => {
    let cancelled = false;

    async function loadEnrolledCourses() {
      try {
        setIsLoadingCourses(true);
        const enrollments = await getMyEnrollments();
        const active = (enrollments || []).filter((e) => e.status === 'ACTIVE');

        if (active.length === 0) {
          if (!cancelled) {
            setEnrolledCourses([]);
            setIsLoadingCourses(false);
          }
          return;
        }

        const coursePromises = active.map(async (e) => {
          try {
            const course = await getCourseDetail(e.courseId);
            return {
              courseId: e.courseId,
              title: course?.title || 'Enrolled Course',
            };
          } catch {
            return {
              courseId: e.courseId,
              title: 'Enrolled Course',
            };
          }
        });

        const courseOptions = await Promise.all(coursePromises);
        if (!cancelled) {
          setEnrolledCourses(courseOptions);
        }
      } catch {
        if (!cancelled) {
          setEnrolledCourses([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCourses(false);
        }
      }
    }

    loadEnrolledCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch recommendations based on selectedCourseId
  const fetchRecommendations = useCallback(async () => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    try {
      const response =
        selectedCourseId === 'ALL'
          ? await getLearnerRecommendations({ limit: 50 })
          : await getLearnerCourseRecommendations(selectedCourseId, { limit: 50 });

      if (!cancelled) {
        setRecommendations(response.recommendations || []);
        setCourseRecommendations(response.courseRecommendations || []);
        setNextBestAction(response.nextBestAction || null);
        setTotalCount(response.totalCount || 0);
      }
    } catch (err: any) {
      if (!cancelled) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load recommendations. Please try again.';
        setError(message);
        setRecommendations([]);
        setCourseRecommendations([]);
        setNextBestAction(null);
        setTotalCount(0);
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // 3. Client-side tier filter
  const filteredRecommendations =
    selectedTier === 'ALL'
      ? recommendations
      : recommendations.filter((r) => r.tier === (selectedTier as RecommendationTier));

  return {
    recommendations: filteredRecommendations,
    rawRecommendations: recommendations,
    courseRecommendations,
    nextBestAction,
    totalCount,
    isLoading,
    isLoadingCourses,
    error,
    refetch: fetchRecommendations,
    selectedCourseId,
    setSelectedCourseId,
    selectedTier,
    setSelectedTier,
    enrolledCourses,
  };
}

