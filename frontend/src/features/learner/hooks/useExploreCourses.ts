import { useState, useEffect, useCallback } from 'react';
import { discoverCourses } from '../api/course.api';
import type { DiscoverCoursesQuery, LearnerCourseItem, PaginationMeta } from '../types/course.types';

export function useExploreCourses(initialQuery: DiscoverCoursesQuery = {}) {
  const [courses, setCourses] = useState<LearnerCourseItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 12,
    totalCourses: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState<DiscoverCoursesQuery>({
    page: 1,
    limit: 12,
    ...initialQuery,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (q: DiscoverCoursesQuery) => {
    try {
      setLoading(true);
      setError(null);
      const data = await discoverCourses(q);
      setCourses(data.courses || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses(query);
  }, [query, fetchCourses]);

  const updateFilters = (newFilters: Partial<DiscoverCoursesQuery>) => {
    setQuery((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  };

  const refresh = () => {
    fetchCourses(query);
  };

  return {
    courses,
    pagination,
    query,
    loading,
    error,
    updateFilters,
    refresh,
  };
}
