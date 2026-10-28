import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/axios';
import {
  startAssessmentAttempt,
  getAssessmentAttemptHistory,
} from '../api/assessmentAttempt.api';
import {
  Award,
  CheckCircle2,
  XCircle,
  Play,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { Assessment } from '../../instructor/types/assessment.types';
import type { AssessmentAttempt } from '../types/assessmentAttempt.types';

export const AssessmentOverviewPage: React.FC = () => {
  const { topicId, courseId } = useParams<{ topicId?: string; courseId?: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [history, setHistory] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let targetAssessment: Assessment | null = null;

        if (topicId) {
          // Topic Assessment
          const res = await api.get<{ data: Assessment[] }>(`/topics/${topicId}/assessments`);
          const published = (res.data.data || []).find((a) => a.status === 'PUBLISHED');
          targetAssessment = published || null;
        } else if (courseId) {
          // Diagnostic Assessment
          const res = await api.get<{ data: Assessment }>(`/courses/${courseId}/diagnostic`);
          targetAssessment = res.data.data;
        }

        if (!targetAssessment) {
          setError('No published assessment found for this module.');
          return;
        }

        setAssessment(targetAssessment);

        // Fetch Attempt History
        try {
          const attempts = await getAssessmentAttemptHistory(targetAssessment._id);
          setHistory(Array.isArray(attempts) ? attempts : []);
        } catch {
          setHistory([]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load assessment information');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [topicId, courseId]);

  const handleStartAttempt = async () => {
    if (!assessment) return;
    try {
      setStarting(true);
      setError(null);

      // Check if there is an IN_PROGRESS attempt already
      const activeAttempt = history.find((a) => a.status === 'IN_PROGRESS');
      if (activeAttempt) {
        navigate(`/learner/assessment-attempts/${activeAttempt._id}`);
        return;
      }

      const newAttempt = await startAssessmentAttempt(assessment._id);
      navigate(`/learner/assessment-attempts/${newAttempt._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start assessment attempt');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
        <p className="text-sm text-text-secondary">Loading assessment details...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-surface-elevated border border-border text-center mt-8">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Assessment Unavailable</h2>
        <p className="text-sm text-text-secondary mb-6">{error || 'This assessment is currently not available.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
        >
          Go Back
        </button>
      </div>
    );
  }

  const activeAttempt = history.find((a) => a.status === 'IN_PROGRESS');
  const completedAttempts = history.filter((a) => a.status === 'SUBMITTED');
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map((a) => a.scorePercent ?? 0))
    : null;
  const hasPassed = completedAttempts.some((a) => a.passed);

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return</span>
      </button>

      {/* Hero Overview */}
      <div className="p-8 rounded-3xl bg-surface-elevated border border-border space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface border border-border text-signal">
            {assessment.type === 'DIAGNOSTIC' ? 'Diagnostic Assessment' : 'Topic Mastery Assessment'}
          </span>

          {hasPassed && (
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Assessment Passed
            </span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">{assessment.title}</h1>
          <p className="text-text-secondary mt-2 text-sm leading-relaxed max-w-2xl">
            {assessment.description ||
              'Test your knowledge and prove topic mastery. Results are scored deterministically and will update your learning evidence profile.'}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface border border-border text-center">
          <div>
            <span className="text-[10px] font-bold text-text-tertiary uppercase block">Questions</span>
            <span className="text-base font-extrabold text-text-primary">
              {assessment.questionsPerAttempt}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-tertiary uppercase block">Pass Score</span>
            <span className="text-base font-extrabold text-text-primary">
              {assessment.passingScore}%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-tertiary uppercase block">Time Limit</span>
            <span className="text-base font-extrabold text-text-primary">
              {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : 'Untimed'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-tertiary uppercase block">Attempts Allowed</span>
            <span className="text-base font-extrabold text-text-primary">
              {assessment.maxAttempts || 'Unlimited'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleStartAttempt}
            disabled={starting}
            className="py-3 px-8 rounded-2xl bg-signal text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : activeAttempt ? (
              <>
                <Play className="w-4 h-4" />
                <span>Resume Attempt in Progress</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>Begin Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Attempt History */}
      {completedAttempts.length > 0 && (
        <div className="p-6 rounded-3xl bg-surface-elevated border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-signal" />
              <span>Previous Attempts ({completedAttempts.length})</span>
            </h2>
            {bestScore !== null && (
              <span className="text-xs text-text-secondary font-medium">
                Best Score: <strong className="text-text-primary">{bestScore}%</strong>
              </span>
            )}
          </div>

          <div className="space-y-2">
            {completedAttempts.map((attempt) => (
              <div
                key={attempt._id}
                onClick={() => navigate(`/learner/assessment-attempts/${attempt._id}`)}
                className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4 hover:border-signal/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs text-text-secondary">
                    #{attempt.attemptNumber}
                  </div>
                  <div>
                    <span className="text-xs text-text-tertiary">
                      {new Date(attempt.submittedAt || attempt.createdAt).toLocaleDateString()}
                    </span>
                    <p className="text-sm font-bold text-text-primary">
                      Score: {attempt.scorePercent}% ({attempt.marksAwarded} / {attempt.totalMarks} marks)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {attempt.passed ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-error-soft text-error border border-error/20 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Below Passing
                    </span>
                  )}
                  <span className="text-xs text-signal font-semibold">Review Answers →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
