import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const requestedAssessmentId = searchParams.get('assessmentId');
  const isFinalAssessment = window.location.pathname.endsWith('/final-assessment');

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [history, setHistory] = useState<AssessmentAttempt[]>([]);
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [finalEligible, setFinalEligible] = useState<boolean | null>(null);
  const [finalEligibilityMessage, setFinalEligibilityMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let candidates: Assessment[] = [];

        if (topicId) {
          const res = await api.get<{ data: Assessment[] }>(`/topics/${topicId}/assessments`);
          candidates = (res.data.data || []).filter((item) => item.status === 'PUBLISHED' && item.type === 'TOPIC');
        } else if (courseId && isFinalAssessment) {
          const [res, eligibility] = await Promise.all([
            api.get<{ data: Assessment[] }>(`/courses/${courseId}/assessments`),
            api.get<{ data: { available: boolean; eligible: boolean; message?: string } }>(`/courses/${courseId}/final-assessment/eligibility`),
          ]);
          candidates = (res.data.data || []).filter((item) => item.status === 'PUBLISHED' && item.type === 'FINAL');
          setFinalEligible(eligibility.data.data.available && eligibility.data.data.eligible);
          setFinalEligibilityMessage(eligibility.data.data.message || null);
        } else if (courseId) {
          const res = await api.get<{ data: Assessment }>(`/courses/${courseId}/diagnostic`);
          candidates = res.data.data ? [res.data.data] : [];
        }

        setAvailableAssessments(candidates);
        let targetAssessment = candidates.find((item) => item._id === requestedAssessmentId) || candidates[0] || null;
        if (!targetAssessment) {
          setError('No published assessment found for this module.');
          return;
        }

        // Re-check individual assessment access for TOPIC assessments. This prevents
        // direct URL navigation from bypassing the backend learning-readiness gate.
        if (targetAssessment.type === 'TOPIC') {
          const verified = await api.get<{ data: Assessment }>(`/assessments/${targetAssessment._id}`);
          targetAssessment = verified.data.data;
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
        const code = err?.response?.data?.code;
        setError(code === 'ASSESSMENT_NOT_READY'
          ? 'This assessment is not available yet. Take some time to explore the learning materials, strengthen your understanding, and prepare before attempting it.'
          : (err?.response?.data?.message || 'Failed to load assessment information'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [topicId, courseId, requestedAssessmentId, isFinalAssessment]);

  const handleStartAttempt = async () => {
    if (!assessment || (assessment.type === 'FINAL' && finalEligible === false)) return;
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
      const code = err?.response?.data?.code;
      setError(code === 'ASSESSMENT_NOT_READY'
        ? 'This assessment is not available yet. Take some time to explore the learning materials, strengthen your understanding, and prepare before attempting it.'
        : (code === 'TOPICS_NOT_COMPLETED' ? 'Complete all required topic assessments before starting the final course assessment.' : (err?.response?.data?.message || 'Failed to start assessment attempt')));
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

      {availableAssessments.length > 1 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Available topic assessments</h2>
            <p className="text-xs text-text-tertiary">Choose the assessment you want to review or attempt.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableAssessments.map((item) => (
              <button key={item._id} type="button" onClick={() => navigate(`/learner/assessments/${topicId}?assessmentId=${encodeURIComponent(item._id)}`)}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${assessment._id === item._id ? 'border-signal bg-signal/5' : 'border-border bg-surface hover:border-signal/40'}`}>
                <span className="block text-sm font-semibold text-text-primary">{item.title}</span>
                <span className="mt-1 block text-xs text-text-tertiary">{item.questionsPerAttempt} questions · Pass score {item.passingScore}%</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Hero Overview */}
      <div className="p-8 rounded-3xl bg-surface-elevated border border-border space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface border border-border text-signal">
            {assessment.type === 'DIAGNOSTIC' ? 'Diagnostic Assessment' : assessment.type === 'FINAL' ? 'Final Course Assessment' : 'Topic Assessment'}
          </span>

          {hasPassed && (
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Assessment Passed
            </span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">{assessment.title}</h1>
          {assessment.type === 'FINAL' && finalEligible === false && (
            <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-text-primary">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div><p className="font-semibold">Final assessment locked</p><p className="mt-1 text-text-secondary">{finalEligibilityMessage || 'First complete and pass the required assessments for every course topic. Then return here to attempt the final assessment.'}</p></div>
            </div>
          )}
          <p className="text-text-secondary mt-2 text-sm leading-relaxed max-w-2xl">
            {assessment.description || (assessment.type === 'FINAL'
              ? 'Evaluate your understanding across the complete course. Required topic assessment conditions are checked by the server before an attempt begins.'
              : 'Test your knowledge and demonstrate your understanding. Results are scored by the assessment system and may contribute to your learning evidence.')}
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
            disabled={starting || (assessment.type === 'FINAL' && finalEligible !== true)}
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
