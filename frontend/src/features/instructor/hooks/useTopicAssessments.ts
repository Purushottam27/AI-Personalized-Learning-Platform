import { useState, useEffect, useCallback } from 'react';
import {
  getAssessmentsByTopic,
  createAssessment,
  updateAssessment,
  publishAssessment,
  archiveAssessment,
  restoreAssessment,
} from '../api/assessment.api';
import type {
  Assessment,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
} from '../types/assessment.types';

export function useTopicAssessments(topicId: string, courseId: string) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async () => {
    if (!topicId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getAssessmentsByTopic(topicId);
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleCreate = async (payload: Omit<CreateAssessmentPayload, 'topicId' | 'courseId' | 'type'>) => {
    const created = await createAssessment({
      ...payload,
      courseId,
      topicId,
      type: 'TOPIC',
    });
    await fetchAssessments();
    return created;
  };

  const handleUpdate = async (id: string, payload: UpdateAssessmentPayload) => {
    const updated = await updateAssessment(id, payload);
    await fetchAssessments();
    return updated;
  };

  const handlePublish = async (id: string) => {
    const published = await publishAssessment(id);
    await fetchAssessments();
    return published;
  };

  const handleArchive = async (id: string) => {
    const archived = await archiveAssessment(id);
    await fetchAssessments();
    return archived;
  };

  const handleRestore = async (id: string) => {
    const restored = await restoreAssessment(id);
    await fetchAssessments();
    return restored;
  };

  return {
    assessments,
    loading,
    error,
    refresh: fetchAssessments,
    handleCreate,
    handleUpdate,
    handlePublish,
    handleArchive,
    handleRestore,
  };
}
