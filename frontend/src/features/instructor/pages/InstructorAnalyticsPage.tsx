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
} from 'lucide-react';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import { useInstructorCourseAnalytics } from '../hooks/useInstructorCourseAnalytics';

export const InstructorAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  const { courses, isLoading: isLoadingCourses, error: coursesError } = useInstructorCourses();

  // Selected course: either from query param or default to the first course
  const selectedCourseId = courseIdParam || (courses.length > 0 ? courses[0]._id : null);

  const [searchLearner, setSearchLearner] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN'>('ALL');
  const [learnerPage, setLearnerPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TOPICS' | 'LEARNERS'>('OVERVIEW');

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

  const handleSelectCourse = (newCourseId: string) => {
    setSearchParams({ courseId: newCourseId });
    setLearnerPage(1);
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
                      Avg Accuracy:{' '}
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
                            Evaluated: {tp.evaluatedLearnersCount} learners • Avg Score:{' '}
                            {tp.averageMasteryScore !== null ? `${tp.averageMasteryScore}%` : 'Awaiting evidence'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {tp.needsImprovementCount > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              {tp.needsImprovementCount} Needs Impr. ({tp.needsImprovementPercentage}%)
                            </span>
                          )}
                          <div className="w-32 hidden sm:flex h-2 rounded-full overflow-hidden bg-surface-elevated border border-border">
                            <div
                              style={{ width: `${tp.masteryDistribution.STRONG.percentage}%` }}
                              className="bg-emerald-500"
                              title={`Strong: ${tp.masteryDistribution.STRONG.count}`}
                            />
                            <div
                              style={{ width: `${tp.masteryDistribution.DEVELOPING.percentage}%` }}
                              className="bg-blue-500"
                              title={`Developing: ${tp.masteryDistribution.DEVELOPING.count}`}
                            />
                            <div
                              style={{ width: `${tp.masteryDistribution.NEEDS_IMPROVEMENT.percentage}%` }}
                              className="bg-rose-500"
                              title={`Needs Improvement: ${tp.masteryDistribution.NEEDS_IMPROVEMENT.count}`}
                            />
                            <div
                              style={{ width: `${tp.masteryDistribution.INSUFFICIENT_EVIDENCE.percentage}%` }}
                              className="bg-neutral-300 dark:bg-neutral-700"
                              title={`Insufficient Evidence: ${tp.masteryDistribution.INSUFFICIENT_EVIDENCE.count}`}
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
                            Evaluated learners: <strong>{tp.evaluatedLearnersCount}</strong> of {tp.totalEnrolled} enrolled • Avg Score:{' '}
                            <strong>{tp.averageMasteryScore !== null ? `${tp.averageMasteryScore}%` : 'N/A'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Distribution Bar */}
                      <div className="space-y-1.5">
                        <div className="h-3.5 rounded-full overflow-hidden flex bg-surface-elevated border border-border">
                          <div
                            style={{ width: `${tp.masteryDistribution.STRONG.percentage}%` }}
                            className="bg-emerald-500 transition-all duration-300"
                            title={`Strong: ${tp.masteryDistribution.STRONG.count} (${tp.masteryDistribution.STRONG.percentage}%)`}
                          />
                          <div
                            style={{ width: `${tp.masteryDistribution.DEVELOPING.percentage}%` }}
                            className="bg-blue-500 transition-all duration-300"
                            title={`Developing: ${tp.masteryDistribution.DEVELOPING.count} (${tp.masteryDistribution.DEVELOPING.percentage}%)`}
                          />
                          <div
                            style={{ width: `${tp.masteryDistribution.NEEDS_IMPROVEMENT.percentage}%` }}
                            className="bg-rose-500 transition-all duration-300"
                            title={`Needs Improvement: ${tp.masteryDistribution.NEEDS_IMPROVEMENT.count} (${tp.masteryDistribution.NEEDS_IMPROVEMENT.percentage}%)`}
                          />
                          <div
                            style={{ width: `${tp.masteryDistribution.INSUFFICIENT_EVIDENCE.percentage}%` }}
                            className="bg-neutral-300 dark:bg-neutral-700 transition-all duration-300"
                            title={`Insufficient Evidence: ${tp.masteryDistribution.INSUFFICIENT_EVIDENCE.count} (${tp.masteryDistribution.INSUFFICIENT_EVIDENCE.percentage}%)`}
                          />
                        </div>

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

          {/* TAB 3: LEARNERS BREAKDOWN */}
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
                            Avg Mastery:{' '}
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
                        <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
                          Topic Performance Breakdown
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {learner.topics.map((t) => {
                            let badgeClass = 'bg-surface-elevated text-text-tertiary border-border';
                            let label = 'Awaiting';
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
