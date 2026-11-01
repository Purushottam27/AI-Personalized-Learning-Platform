import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Users,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Search,
  BookOpen,
  ChevronDown,
  RefreshCw,
  Clock,
  Layers,
  FileCheck2,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import { useInstructorCourseAnalytics } from '../hooks/useInstructorCourseAnalytics';
import { useInstructorAssessmentAnalytics } from '../hooks/useInstructorAssessmentAnalytics';
import { getInstructorQuestionAnalytics } from '../api/analytics.api';
import type { InstructorQuestionAnalyticsResponse } from '../types/analytics.types';

type MasteryDistribution = {
  STRONG: { count: number; percentage: number };
  DEVELOPING: { count: number; percentage: number };
  NEEDS_IMPROVEMENT: { count: number; percentage: number };
  INSUFFICIENT_EVIDENCE: { count: number; percentage: number };
};

const MASTERY_SEGMENTS = [
  { key: 'STRONG', label: 'Strong', className: 'bg-emerald-500' },
  { key: 'DEVELOPING', label: 'Developing', className: 'bg-blue-500' },
  { key: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement', className: 'bg-rose-500' },
  { key: 'INSUFFICIENT_EVIDENCE', label: 'Awaiting Evidence', className: 'bg-neutral-300 dark:bg-neutral-700' },
] as const;

const MasteryDistributionBar: React.FC<{
  distribution: MasteryDistribution;
  compact?: boolean;
}> = ({ distribution, compact = false }) => {
  const total = MASTERY_SEGMENTS.reduce(
    (sum, segment) => sum + distribution[segment.key].count,
    0,
  );

  if (total === 0) {
    return (
      <p className="text-[10px] text-text-tertiary whitespace-nowrap">
        No learner evidence yet
      </p>
    );
  }

  return (
    <div
      role="img"
      aria-label={MASTERY_SEGMENTS
        .filter((segment) => distribution[segment.key].count > 0)
        .map((segment) => {
          const item = distribution[segment.key];
          return `${segment.label}: ${item.count} learners (${item.percentage}%)`;
        })
        .join(', ')}
      className={`${compact ? 'w-32 h-2' : 'w-full h-3.5'} rounded-full overflow-hidden flex bg-surface-elevated border border-border`}
    >
      {MASTERY_SEGMENTS.map((segment) => {
        const item = distribution[segment.key];
        if (item.count <= 0) return null;

        return (
          <div
            key={segment.key}
            className={`${segment.className} transition-[width] duration-300`}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${segment.label}: ${item.count} (${item.percentage}%)`}
          />
        );
      })}
    </div>
  );
};

export const InstructorAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  const { courses, isLoading: isLoadingCourses, error: coursesError } = useInstructorCourses();

  // Selected course: either from query param or default to the first course
  const selectedCourseId = courseIdParam || (courses.length > 0 ? courses[0]._id : null);

  const [searchLearner, setSearchLearner] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN'>('ALL');
  const [learnerPage, setLearnerPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TOPICS' | 'ASSESSMENTS' | 'INSIGHTS' | 'LEARNERS'>('OVERVIEW');

  // Selected assessment for question-level modal/deep-dive
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<InstructorQuestionAnalyticsResponse | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const {
    analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch,
  } = useInstructorCourseAnalytics(selectedCourseId, {
    page: learnerPage,
    limit: 10,
    status: statusFilter,
    search: searchLearner,
  });

  const {
    assessmentAnalytics,
    isLoading: isLoadingAssessments,
    error: assessmentError,
    refetch: refetchAssessments,
  } = useInstructorAssessmentAnalytics(selectedCourseId);

  const handleSelectCourse = (newCourseId: string) => {
    setSearchParams({ courseId: newCourseId });
    setLearnerPage(1);
    setSelectedAssessmentId(null);
    setQuestionAnalytics(null);
  };

  const handleOpenQuestions = async (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setIsLoadingQuestions(true);
    setQuestionError(null);
    try {
      const data = await getInstructorQuestionAnalytics(assessmentId);
      setQuestionAnalytics(data);
    } catch (err: any) {
      setQuestionError(err.message || 'Failed to load question analytics');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Loading courses
  if (isLoadingCourses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-signal animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Loading teaching courses...</p>
      </div>
    );
  }

  // Error loading courses
  if (coursesError) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-surface border border-border text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-error-soft text-error flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Unable to load courses</h2>
        <p className="text-sm text-text-secondary">{coursesError}</p>
      </div>
    );
  }

  // No courses created by instructor yet
  if (courses.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 rounded-3xl bg-surface border border-border text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border text-signal flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary">No Courses Created Yet</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Analytics and learner performance insights become available once you create courses and enroll learners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header with Course Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-signal uppercase tracking-wider mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>Instructor Performance Insights</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            Course Performance & Learning Analytics
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Evidence-based mastery distributions, topic difficulty signals, and learner progress metrics.
          </p>
        </div>

        {/* Course Dropdown Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="course-select" className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Course:
          </label>
          <div className="relative">
            <select
              id="course-select"
              value={selectedCourseId || ''}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer hover:border-border-muted transition-colors shadow-xs"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Analytics Content Area */}
      {isLoadingAnalytics ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-signal animate-spin" />
          <p className="text-xs font-medium text-text-tertiary">Aggregating course analytics from evidence records...</p>
        </div>
      ) : analyticsError ? (
        <div className="p-8 rounded-2xl bg-surface border border-error/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-error mx-auto" />
          <h3 className="text-base font-bold text-text-primary">Failed to load analytics</h3>
          <p className="text-xs text-text-secondary">{analyticsError}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-signal text-white text-xs font-semibold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : !analytics ? null : (
        <div className="space-y-8">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border-muted pb-1">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-signal text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              Course Overview
            </button>
            <button
              onClick={() => setActiveTab('TOPICS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'TOPICS'
                  ? 'bg-signal text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              Topic Distributions ({analytics.topicsPerformance.length})
            </button>
            <button
              onClick={() => setActiveTab('ASSESSMENTS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ASSESSMENTS'
                  ? 'bg-signal text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Assessments ({assessmentAnalytics?.assessments.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('INSIGHTS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'INSIGHTS'
                  ? 'bg-signal text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insights ({assessmentAnalytics?.insights.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('LEARNERS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'LEARNERS'
                  ? 'bg-signal text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              Learners Breakdown ({analytics.learners.pagination.totalItems})
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Stat Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-tertiary mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Enrolled Learners</span>
                    <Users className="w-5 h-5 text-signal" />
                  </div>
                  <div>
                    <span className="text-3xl font-bold font-display text-text-primary">
                      {analytics.overview.totalEnrolledLearners}
                    </span>
                    <span className="text-xs text-text-tertiary block mt-1">
                      {analytics.overview.enrollmentBreakdown.active} active • {analytics.overview.enrollmentBreakdown.completed} completed
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-tertiary mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Study Activity</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-3xl font-bold font-display text-text-primary">
                      {analytics.overview.activeLearners.totalActiveAllTime}
                    </span>
                    <span className="text-xs text-text-tertiary block mt-1">
                      {analytics.overview.activeLearners.activeLast7Days} active in last 7 days
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-tertiary mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Eligible Attempts</span>
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-3xl font-bold font-display text-text-primary">
                      {analytics.overview.totalEligibleAttempts}
                    </span>
                    <span className="text-xs text-text-tertiary block mt-1">
                      Weighted Accuracy:{' '}
                      <strong className="text-text-primary">
                        {analytics.overview.overallAverageAccuracy !== null ? `${analytics.overview.overallAverageAccuracy}%` : 'N/A'}
                      </strong>
                    </span>
                  </div>
                </div>
                

                <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-tertiary mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Needs Improvement</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <span className="text-3xl font-bold font-display text-text-primary">
                      {analytics.overview.learnersWithNeedsImprovementCount ?? analytics.overview.learnersNeedingAttentionCount}
                    </span>
                    <span className="text-xs text-text-tertiary block mt-1">
                      Learners with Needs Improvement Evidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Course-level topics summary preview */}
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                    <Layers className="w-4 h-4 text-signal" />
                    <span>Curriculum Topics Overview ({analytics.topicsPerformance.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('TOPICS')}
                    className="text-xs font-semibold text-signal hover:underline"
                  >
                    View detailed distributions &rarr;
                  </button>
                </div>
                {analytics.topicsPerformance.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No topics found in this course.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {analytics.topicsPerformance.map((tp) => (
                      <div key={tp.topicId} className="py-3 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-text-primary block">
                            Topic {tp.order}: {tp.title}
                          </span>
                          <span className="text-[11px] text-text-tertiary">
                            Evaluated: {tp.evaluatedLearnersCount} learners • Average mastery score:{' '}
                            {tp.averageMasteryScore !== null ? `${tp.averageMasteryScore}%` : 'Awaiting evidence'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {tp.needsImprovementCount > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              {tp.needsImprovementCount} Needs Impr. ({tp.needsImprovementPercentage}%)
                            </span>
                          )}
                          <div className="hidden sm:block">
                            <MasteryDistributionBar
                              distribution={tp.masteryDistribution}
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TOPIC DISTRIBUTIONS */}
          {activeTab === 'TOPICS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Topic Mastery Distribution</h2>
                  <p className="text-xs text-text-secondary">
                    Learner distribution across mastery levels. Insufficient evidence is separated from demonstrated performance.
                  </p>
                </div>
                {/* Color Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-tertiary">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Strong</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Developing</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Needs Improvement</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    <span>Awaiting Evidence</span>
                  </span>
                </div>
              </div>

              {analytics.topicsPerformance.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-tertiary bg-surface rounded-2xl border border-border">
                  No topics created for this course.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {analytics.topicsPerformance.map((tp) => (
                    <div
                      key={tp.topicId}
                      className="p-5 rounded-2xl border border-border bg-surface hover:border-border-muted transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-tertiary bg-surface-disabled px-2 py-0.5 rounded-md">
                              Topic {tp.order}
                            </span>
                            <h3 className="text-sm font-bold text-text-primary">{tp.title}</h3>
                            {tp.needsImprovementCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                {tp.needsImprovementCount} Needs Improvement ({tp.needsImprovementPercentage}%)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-tertiary mt-1 block">
                            Evaluated learners: <strong>{tp.evaluatedLearnersCount}</strong> of {tp.totalEnrolled} enrolled • Average mastery score:{' '}
                            <strong>{tp.averageMasteryScore !== null ? `${tp.averageMasteryScore}%` : 'N/A'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Distribution Bar */}
                      <div className="space-y-1.5">
                        <MasteryDistributionBar
                          distribution={tp.masteryDistribution}
                        />

                        {/* Breakdown Numbers */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-surface-elevated border border-border flex items-center justify-between">
                            <span className="text-text-secondary flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Strong:
                            </span>
                            <span className="font-bold text-text-primary">
                              {tp.masteryDistribution.STRONG.count} ({tp.masteryDistribution.STRONG.percentage}%)
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-surface-elevated border border-border flex items-center justify-between">
                            <span className="text-text-secondary flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" /> Developing:
                            </span>
                            <span className="font-bold text-text-primary">
                              {tp.masteryDistribution.DEVELOPING.count} ({tp.masteryDistribution.DEVELOPING.percentage}%)
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-surface-elevated border border-border flex items-center justify-between">
                            <span className="text-text-secondary flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" /> Needs Impr.:
                            </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {tp.masteryDistribution.NEEDS_IMPROVEMENT.count} ({tp.masteryDistribution.NEEDS_IMPROVEMENT.percentage}%)
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-surface-elevated border border-border flex items-center justify-between">
                            <span className="text-text-secondary flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-neutral-400" /> Awaiting:
                            </span>
                            <span className="font-bold text-text-tertiary">
                              {tp.masteryDistribution.INSUFFICIENT_EVIDENCE.count} ({tp.masteryDistribution.INSUFFICIENT_EVIDENCE.percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSESSMENTS PERFORMANCE */}
          {activeTab === 'ASSESSMENTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Assessment-Level Performance</h2>
                  <p className="text-xs text-text-secondary">
                    Completion statistics, pass/fail ratios, and score distribution per assessment.
                  </p>
                </div>
                {selectedAssessmentId && (
                  <button
                    onClick={() => {
                      setSelectedAssessmentId(null);
                      setQuestionAnalytics(null);
                    }}
                    className="text-xs font-semibold text-signal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back to all assessments
                  </button>
                )}
              </div>

              {isLoadingAssessments ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <RefreshCw className="w-6 h-6 text-signal animate-spin" />
                  <p className="text-xs text-text-tertiary">Loading assessment performance data...</p>
                </div>
              ) : assessmentError ? (
                <div className="p-6 rounded-2xl bg-surface border border-error/30 text-center space-y-2">
                  <p className="text-xs text-error">{assessmentError}</p>
                  <button onClick={() => refetchAssessments()} className="text-xs text-signal font-semibold">
                    Retry
                  </button>
                </div>
              ) : isLoadingQuestions ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <RefreshCw className="w-6 h-6 text-signal animate-spin" />
                  <p className="text-xs text-text-tertiary">Loading question-level response statistics...</p>
                </div>
              ) : questionError ? (
                <div className="p-6 rounded-2xl bg-surface border border-error/30 text-center space-y-2">
                  <p className="text-xs text-error">{questionError}</p>
                  <button
                    onClick={() => selectedAssessmentId && handleOpenQuestions(selectedAssessmentId)}
                    className="text-xs text-signal font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : selectedAssessmentId && questionAnalytics ? (
                /* Question Deep Dive for Selected Assessment */
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-soft text-signal uppercase">
                          {questionAnalytics.assessmentType}
                        </span>
                        <h3 className="text-base font-bold text-text-primary">{questionAnalytics.assessmentTitle}</h3>
                      </div>
                      <p className="text-xs text-text-tertiary mt-1">
                        Passing Score: {questionAnalytics.passingScore}% • {questionAnalytics.totalPoolQuestions} questions in pool • {questionAnalytics.totalCompletedAttempts} submitted attempts
                      </p>
                    </div>
                  </div>

                  {/* Assessment evidence summary */}
                  {(() => {
                    const assessmentSummary = assessmentAnalytics?.assessments.find(
                      (item) => item.assessmentId === selectedAssessmentId,
                    );
                    const flaggedQuestions = questionAnalytics.questions.filter(
                      (question) => question.responsePatternSignal === 'HIGH_INCORRECT_RATE'
                        || question.responsePatternSignal === 'HIGH_UNANSWERED_RATE',
                    );
                    const evaluatedAttempts = questionAnalytics.totalEvaluatedAttempts ?? 0;
                    const unevaluatedAttempts = questionAnalytics.totalUnevaluatedAttempts ?? Math.max(
                      0,
                      questionAnalytics.totalCompletedAttempts - evaluatedAttempts,
                    );

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                          {[
                            { label: 'Submitted attempts', value: questionAnalytics.totalCompletedAttempts, detail: 'All submitted attempts' },
                            { label: 'Evaluated attempts', value: evaluatedAttempts, detail: 'Used for response analysis' },
                            { label: 'Unevaluated attempts', value: unevaluatedAttempts, detail: 'Excluded from performance signals' },
                            { label: 'Questions in pool', value: questionAnalytics.totalPoolQuestions, detail: `${questionAnalytics.questions.length} question records returned` },
                          ].map((metric) => (
                            <div key={metric.label} className="rounded-xl border border-border bg-surface p-4 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{metric.label}</span>
                              <p className="text-2xl font-display font-bold text-text-primary tabular-nums">{metric.value}</p>
                              <p className="text-[10px] text-text-tertiary">{metric.detail}</p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-border bg-surface-elevated/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-text-primary">Question response overview</p>
                            <p className="text-[11px] text-text-secondary">
                              {flaggedQuestions.length > 0
                                ? `${flaggedQuestions.length} question(s) currently carry a response-pattern signal. Review their individual evidence below.`
                                : 'No high-incorrect or high-unanswered response signals are currently recorded for this assessment.'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-2xl font-bold text-text-primary tabular-nums">{flaggedQuestions.length}</span>
                            <span className="block text-[10px] text-text-tertiary uppercase tracking-wider">Flagged questions</span>
                          </div>
                        </div>

                        {assessmentSummary && (
                          <div className="rounded-xl border border-border bg-surface p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-text-primary">Assessment outcome</p>
                                <p className="text-[11px] text-text-tertiary mt-1">Pass/fail metrics use evaluated attempts only.</p>
                              </div>
                              <div className="flex flex-wrap gap-5">
                                <div><p className="text-lg font-bold text-text-primary tabular-nums">{assessmentSummary.passPercentage !== null ? `${assessmentSummary.passPercentage}%` : '—'}</p><p className="text-[10px] text-text-tertiary">Pass rate</p></div>
                                <div><p className="text-lg font-bold text-text-primary tabular-nums">{assessmentSummary.averageScore !== null ? `${assessmentSummary.averageScore}%` : '—'}</p><p className="text-[10px] text-text-tertiary">Average score</p></div>
                                <div><p className="text-lg font-bold text-text-primary tabular-nums">{assessmentSummary.passingScore}%</p><p className="text-[10px] text-text-tertiary">Pass threshold</p></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Question-level evidence */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Question-level evidence ({questionAnalytics.questions.length})
                        </h4>
                        <p className="text-[11px] text-text-tertiary mt-1">Response counts are based on evaluated exposures; each question shows its own sample size.</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] text-text-tertiary">
                        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-500" />Correct</span>
                        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-500" />Incorrect</span>
                        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-neutral-400" />Unanswered</span>
                      </div>
                    </div>
                    {questionAnalytics.questions.map((q, idx) => (
                      <div key={q.questionId} className="p-4 rounded-xl border border-border bg-surface space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded">
                                Q{idx + 1} • {q.type}
                              </span>
                              <span className="text-[10px] font-semibold text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                                {q.configuredDifficulty}
                              </span>
                              {q.responsePatternSignal === 'HIGH_INCORRECT_RATE' && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                  High Incorrect Rate
                                </span>
                              )}
                              {q.responsePatternSignal === 'HIGH_UNANSWERED_RATE' && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  High Unanswered
                                </span>
                              )}
                              {q.responsePatternSignal === 'INSUFFICIENT_DATA' && (
                                <span className="text-[10px] font-medium text-text-tertiary bg-neutral-500/10 px-1.5 py-0.5 rounded">
                                  Awaiting Responses
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-text-primary pt-1">{q.questionText}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-text-primary block">
                              {q.correctPercentage !== null ? `${q.correctPercentage}% Correct` : 'N/A'}
                            </span>
                            <span className="text-[11px] text-text-tertiary">
                              {q.totalExposures} total exposures
                            </span>
                          </div>
                        </div>

                        {/* Breakdown bar */}
                        <div className="space-y-1 pt-1">
                          <div className="h-2 rounded-full overflow-hidden flex bg-surface-elevated border border-border">
                            {q.totalExposures > 0 ? (
                              <>
                                <div
                                  style={{ width: `${q.correctPercentage || 0}%` }}
                                  className="bg-emerald-500"
                                  title={`Correct: ${q.correctCount}`}
                                />
                                <div
                                  style={{ width: `${q.incorrectPercentage || 0}%` }}
                                  className="bg-rose-500"
                                  title={`Incorrect: ${q.incorrectCount}`}
                                />
                                <div
                                  style={{ width: `${q.unansweredPercentage || 0}%` }}
                                  className="bg-neutral-400"
                                  title={`Unanswered: ${q.unansweredCount}`}
                                />
                              </>
                            ) : (
                              <div className="w-full bg-surface-disabled" title="No response data" />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                            <span>Correct: <strong className="text-emerald-600 dark:text-emerald-400">{q.correctCount}</strong> ({q.correctPercentage !== null ? `${q.correctPercentage}%` : 'N/A'})</span>
                            <span>Incorrect: <strong className="text-rose-600 dark:text-rose-400">{q.incorrectCount}</strong> ({q.incorrectPercentage !== null ? `${q.incorrectPercentage}%` : 'N/A'})</span>
                            <span>Unanswered: <strong>{q.unansweredCount}</strong> ({q.unansweredPercentage !== null ? `${q.unansweredPercentage}%` : 'N/A'})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !assessmentAnalytics || assessmentAnalytics.assessments.length === 0 ? (
                <div className="p-12 text-center text-xs text-text-tertiary bg-surface rounded-2xl border border-border">
                  No assessments configured for this course yet.
                </div>
              ) : (
                /* Assessment Cards List */
                <div className="grid grid-cols-1 gap-4">
                  {assessmentAnalytics.assessments.map((a) => (
                    <div
                      key={a.assessmentId}
                      className="p-5 rounded-2xl border border-border bg-surface hover:border-border-muted transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-soft text-signal uppercase">
                              {a.type}
                            </span>
                            {a.topicTitle && (
                              <span className="text-[11px] font-medium text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded">
                                Topic {a.topicOrder}: {a.topicTitle}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-text-secondary border border-border px-1.5 py-0.5 rounded">
                              Passing: {a.passingScore}%
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-text-primary pt-0.5">{a.title}</h3>
                          <span className="text-xs text-text-tertiary block">
                            {a.totalAttempts} submitted attempts • {a.uniqueLearnersCount} unique learners
                            {a.inProgressAttemptsCount > 0 && ` • ${a.inProgressAttemptsCount} in-progress`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-text-primary block">
                              Avg Score: {a.averageScore !== null ? `${a.averageScore}%` : 'N/A'}
                            </span>
                            <span className="text-[11px] text-text-tertiary">
                              Pass Rate: {a.passPercentage !== null ? `${a.passPercentage}%` : 'Awaiting data'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenQuestions(a.assessmentId)}
                            className="px-3 py-2 rounded-xl bg-surface-elevated border border-border hover:border-signal text-text-primary text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <span>Questions</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Score distribution / completion info */}
                      <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-text-tertiary block">Participation</span>
                          <span className="font-bold text-text-primary">
                            {a.participationRate !== null ? `${a.participationRate}%` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-text-tertiary block">Completion Rate</span>
                          <span className="font-bold text-text-primary">
                            {a.completionRate !== null ? `${a.completionRate}%` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-text-tertiary block">Passed</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {a.passedCount} ({a.passPercentage !== null ? `${a.passPercentage}%` : 'N/A'})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-text-tertiary block">Failed</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {a.failedCount} ({a.failPercentage !== null ? `${a.failPercentage}%` : 'N/A'})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIONABLE INSIGHTS */}
          {activeTab === 'INSIGHTS' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-text-primary">Actionable Instructor Insights</h2>
                <p className="text-xs text-text-secondary">
                  Evidence-backed observations and recommended pedagogical actions derived from student activity and assessment responses.
                </p>
              </div>

              {!assessmentAnalytics || assessmentAnalytics.insights.length === 0 ? (
                <div className="p-12 text-center text-xs text-text-tertiary bg-surface rounded-2xl border border-border space-y-2">
                  <Sparkles className="w-8 h-8 text-signal mx-auto opacity-60" />
                  <p className="font-semibold text-text-primary">No Actionable Insights Available from Current Evidence</p>
                  <p className="max-w-md mx-auto">
                    Evidence-backed insights and recommended pedagogical actions will appear as learners submit attempts and complete curriculum topics.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {assessmentAnalytics.insights.map((insight) => (
                    <article
                      key={insight.id}
                      className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-signal" />
                      <div className="p-5 sm:p-6 pl-6 sm:pl-7 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                            <Sparkles className="w-3 h-3 text-signal" />
                            {insight.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                            Evidence source · {insight.reference.type}
                          </span>
                        </div>

                        <div className="max-w-4xl space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-signal">Observed learning signal</span>
                          <h3 className="text-base sm:text-lg font-bold text-text-primary">{insight.title}</h3>
                          <p className="text-sm leading-relaxed text-text-secondary">{insight.observation}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3">
                          <div className="rounded-xl border border-border bg-surface-elevated/70 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-text-tertiary" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Evidence behind this finding</span>
                            </div>
                            <p className="text-sm font-semibold leading-relaxed text-text-primary">{insight.supportingEvidence}</p>
                            {insight.reference.title && <p className="text-[11px] text-text-tertiary">Reference: {insight.reference.title}</p>}
                          </div>
                          <div className="rounded-xl border border-signal/25 bg-signal/5 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-signal" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-signal">Suggested instructor action</span>
                            </div>
                            <p className="text-sm leading-relaxed text-text-primary">{insight.suggestedAction}</p>
                          </div>
                        </div>

                        {insight.dataLimitationNotice && (
                          <div className="flex items-start gap-2 border-t border-border pt-3 text-[11px] leading-relaxed text-text-tertiary">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p><span className="font-semibold text-text-secondary">Interpretation limit: </span>{insight.dataLimitationNotice}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LEARNERS BREAKDOWN */}
          {activeTab === 'LEARNERS' && (
            <div className="space-y-6">
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by learner name or email..."
                    value={searchLearner}
                    onChange={(e) => {
                      setSearchLearner(e.target.value);
                      setLearnerPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setLearnerPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer"
                  >
                    <option value="ALL">All Enrollments</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">How to read this breakdown:</span>{' '}
                enrollment status describes the learner’s course enrollment, while topic badges describe
                demonstrated mastery. “Awaiting Evidence” means there is not enough evidence to show a
                mastery level; it is not a low-performance rating.
              </div>

              {/* Learners Table / Cards */}
              {analytics.learners.items.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-surface border border-border text-xs text-text-tertiary">
                  No learners found matching the search and filter criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.learners.items.map((learner) => (
                    <div
                      key={learner.learnerId}
                      className="p-5 rounded-2xl border border-border bg-surface hover:border-border-muted transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-muted pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-signal-soft text-signal font-bold flex items-center justify-center text-sm uppercase">
                            {learner.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-text-primary">{learner.name}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-disabled text-text-secondary border border-border">
                                {learner.enrollmentStatus}
                              </span>
                              {(learner.hasNeedsImprovementEvidence || learner.needsAttention) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title="At least one evaluated topic has Needs Improvement status">
                                  <AlertTriangle className="w-3 h-3" /> Needs Improvement Evidence
                                </span>
                              )}
                              {learner.isAwaitingEvidence && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-500/10 text-text-tertiary border border-neutral-500/20">
                                  <HelpCircle className="w-3 h-3" /> Awaiting Evidence
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-text-tertiary">{learner.email}</span>
                          </div>
                        </div>

                        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                          <span className="text-xs text-text-secondary">
                            Average mastery score:{' '}
                            <strong className="text-text-primary">
                              {learner.averageMasteryScore !== null ? `${learner.averageMasteryScore}%` : 'N/A'}
                            </strong>
                          </span>
                          <span className="text-[11px] text-text-tertiary">
                            {learner.totalEligibleAttempts} attempts • {learner.progressPercentage}% topics mastered
                          </span>
                        </div>
                      </div>

                      {/* Topic-by-Topic Mastery Pills */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                            Topic Performance Breakdown
                          </span>
                          <span className="text-[10px] text-text-tertiary">
                            Score and status are shown per topic
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {learner.topics.map((t) => {
                            let badgeClass = 'bg-surface-elevated text-text-tertiary border-border';
                            let label = 'Awaiting evidence';
                            if (t.status === 'STRONG' || t.status === 'MASTERED') {
                              badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                              label = `${t.masteryScore}%`;
                            } else if (t.status === 'FUNCTIONAL') {
                              badgeClass = 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
                              label = `${t.masteryScore}% (Functional)`;
                            } else if (t.status === 'DEVELOPING') {
                              badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                              label = `${t.masteryScore}%`;
                            } else if (t.status === 'NEEDS_IMPROVEMENT') {
                              badgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                              label = `${t.masteryScore}% (Needs Impr.)`;
                            }

                            return (
                              <div
                                key={t.topicId}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${badgeClass}`}
                                title={`Topic ${t.order}: ${t.title} (${t.status}, conf: ${Math.round(t.confidence * 100)}%, evidence: ${t.evidenceCount})`}
                              >
                                <span className="font-semibold text-text-primary">T{t.order}:</span>
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {analytics.learners.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-xs text-text-tertiary">
                        Showing page {analytics.learners.pagination.currentPage} of {analytics.learners.pagination.totalPages} (
                        {analytics.learners.pagination.totalItems} total learners)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={learnerPage <= 1}
                          onClick={() => setLearnerPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-surface-elevated"
                        >
                          Previous
                        </button>
                        <button
                          disabled={learnerPage >= analytics.learners.pagination.totalPages}
                          onClick={() => setLearnerPage((p) => p + 1)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-surface-elevated"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
