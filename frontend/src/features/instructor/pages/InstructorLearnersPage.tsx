import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Search,
  Users,
  UserRound,
  RefreshCw,
  Activity,
  Info,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import { useInstructorCourseAnalytics } from '../hooks/useInstructorCourseAnalytics';
import type { LearnerPerformanceItem } from '../types/analytics.types';

type EnrollmentFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';

const PAGE_SIZE = 10;

const FILTERS: { value: EnrollmentFilter; label: string }[] = [
  { value: 'ALL', label: 'All learners' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No recorded activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'L';
}

function enrollmentLabel(status: LearnerPerformanceItem['enrollmentStatus']): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function signalForLearner(learner: LearnerPerformanceItem): {
  label: string;
  description: string;
  className: string;
  icon: React.ElementType;
} {
  if (learner.needsAttention) {
    return {
      label: 'Needs review',
      description: `${learner.needsImprovementTopicsCount} topic${learner.needsImprovementTopicsCount === 1 ? '' : 's'} need attention`,
      className: 'border-error/20 bg-error-soft/60 text-error',
      icon: AlertTriangle,
    };
  }

  if (learner.isAwaitingEvidence) {
    return {
      label: 'Awaiting evidence',
      description: 'Not enough learning evidence yet',
      className: 'border-border bg-surface-elevated text-text-secondary',
      icon: Clock3,
    };
  }

  return {
    label: 'No weakness flagged',
    description: 'No current topic weakness detected',
    className: 'border-sage/20 bg-sage-soft/60 text-sage',
    icon: CheckCircle2,
  };
}

const MetricCard: React.FC<{
  label: string;
  value: number | string;
  supportingText: string;
  icon: React.ElementType;
  tone?: 'default' | 'sage' | 'signal';
}> = ({ label, value, supportingText, icon: Icon, tone = 'default' }) => {
  const iconTone = tone === 'sage'
    ? 'text-sage bg-sage-soft'
    : tone === 'signal'
      ? 'text-signal bg-signal-soft'
      : 'text-text-secondary bg-surface-elevated';

  return (
    <article className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold leading-none tabular-nums text-text-primary">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{supportingText}</p>
    </article>
  );
};

const LearnerSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3 rounded-2xl border border-border bg-surface p-4" aria-hidden="true">
    <div className="h-4 w-1/3 rounded bg-surface-disabled" />
    <div className="h-3 w-2/3 rounded bg-surface-disabled" />
    <div className="h-3 w-1/2 rounded bg-surface-disabled" />
  </div>
);

const LearnerSignal: React.FC<{ learner: LearnerPerformanceItem }> = ({ learner }) => {
  const signal = signalForLearner(learner);
  const Icon = signal.icon;

  return (
    <div className={`inline-flex max-w-full items-start gap-2 rounded-xl border px-3 py-2 ${signal.className}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{signal.label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug opacity-80">{signal.description}</span>
      </span>
    </div>
  );
};

const LearnerIdentity: React.FC<{ learner: LearnerPerformanceItem }> = ({ learner }) => (
  <div className="flex min-w-0 items-center gap-3">
    {learner.avatar ? (
      <img
        src={learner.avatar}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
        loading="lazy"
      />
    ) : (
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text-secondary">
        {getInitials(learner.name)}
      </span>
    )}
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-text-primary">{learner.name}</span>
      <span className="block truncate text-xs text-text-secondary">{learner.email || 'Email unavailable'}</span>
    </span>
  </div>
);

const LearnerCard: React.FC<{
  learner: LearnerPerformanceItem;
  totalTopics: number;
  courseId: string | null;
}> = ({ learner, totalTopics, courseId }) => (
  <article className="rounded-2xl border border-border bg-surface p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {courseId ? (
          <Link
            to={`/instructor/learners/${learner.learnerId}?courseId=${courseId}`}
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={`View ${learner.name}'s details in this course`}
          >
            <LearnerIdentity learner={learner} />
          </Link>
        ) : (
          <LearnerIdentity learner={learner} />
        )}
      </div>
      <span className="shrink-0 rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {enrollmentLabel(learner.enrollmentStatus)}
      </span>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border-muted py-3">
      <div>
        <p className="text-[11px] text-text-tertiary">Topics mastered</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{learner.masteredTopicsCount} / {totalTopics}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-disabled">
          <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(100, learner.progressPercentage)}%` }} />
        </div>
      </div>
      <div>
        <p className="text-[11px] text-text-tertiary">Average mastery</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
          {learner.averageMasteryScore === null ? '—' : `${learner.averageMasteryScore}%`}
        </p>
      </div>
    </div>
    <div className="mt-3 flex flex-col gap-3">
      <LearnerSignal learner={learner} />
      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Last recorded activity: {formatDate(learner.lastActiveAt)}
      </p>
    </div>
  </article>
);

export const InstructorLearnersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const { courses, isLoading: isLoadingCourses, error: coursesError, refetch: refetchCourses } = useInstructorCourses();

  const selectedCourse = courses.find((course) => course._id === courseIdParam) ?? courses[0] ?? null;
  const selectedCourseId = selectedCourse?._id ?? null;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnrollmentFilter>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (isLoadingCourses || courses.length === 0) return;
    if (!selectedCourseId) return;
    if (courseIdParam !== selectedCourseId) {
      setSearchParams({ courseId: selectedCourseId }, { replace: true });
    }
  }, [courseIdParam, courses, isLoadingCourses, selectedCourseId, setSearchParams]);

  const {
    analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useInstructorCourseAnalytics(selectedCourseId, {
    page,
    limit: PAGE_SIZE,
    status: statusFilter,
    search: debouncedSearch,
  });

  const handleCourseChange = (courseId: string) => {
    setPage(1);
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setSearchParams({ courseId });
  };

  const pagination = analytics?.learners.pagination;
  const learners = analytics?.learners.items ?? [];
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;
  const overview = analytics?.overview;

  if (isLoadingCourses) {
    return (
      <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-disabled" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <LearnerSkeleton key={index} />)}
        </div>
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-error/20 bg-error-soft/40 p-6 sm:p-8" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-text-primary">Unable to load your courses</h1>
            <p className="mt-1 text-sm text-text-secondary">{coursesError}</p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={() => void refetchCourses()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto flex min-h-[42vh] max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-signal">
          <GraduationCap className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Instructor workspace</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-text-primary">Your learners will appear here</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Create a course and enroll learners to start viewing course-specific participation and learning evidence.
        </p>
        <Button className="mt-5" onClick={() => navigate('/instructor/courses/create')}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />Create a course
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="flex flex-col gap-5 border-b border-border-muted pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Instructor workspace</p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">Learners</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Understand enrollment, recent learning activity, and topic mastery within each course.
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          <label htmlFor="learners-course-select" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Viewing learners in
          </label>
          <select
            id="learners-course-select"
            value={selectedCourseId ?? ''}
            onChange={(event) => handleCourseChange(event.target.value)}
            className="w-full cursor-pointer rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-semibold text-text-primary outline-none transition-colors focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
          >
            {courses.map((course) => (
              <option key={course._id} value={course._id}>{course.title} · {course.status.toLowerCase()}</option>
            ))}
          </select>
          {selectedCourse && (
            <p className="mt-2 truncate text-xs text-text-tertiary">
              {selectedCourse.domain || 'Course'}{selectedCourse.category ? ` · ${selectedCourse.category}` : ''}
            </p>
          )}
        </div>
      </header>

      {isLoadingAnalytics && !analytics ? (
        <section className="space-y-4" aria-label="Loading learner analytics" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <LearnerSkeleton key={index} />)}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
        </section>
      ) : analyticsError ? (
        <div className="rounded-2xl border border-error/20 bg-error-soft/40 p-6" role="alert">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-text-primary">Unable to load learners for this course</h2>
                <p className="mt-1 text-sm text-text-secondary">{analyticsError}</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void refetchAnalytics()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Retry
            </Button>
          </div>
        </div>
      ) : analytics ? (
        <>
          <section aria-label="Course learner overview" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text-primary">Course snapshot</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Metrics are scoped to this course
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Enrolled learners"
                value={overview?.totalEnrolledLearners ?? 0}
                supportingText={`${overview?.enrollmentBreakdown.active ?? 0} active · ${overview?.enrollmentBreakdown.completed ?? 0} completed`}
                icon={Users}
              />
              <MetricCard
                label="Active in 7 days"
                value={overview?.activeLearners.activeLast7Days ?? 0}
                supportingText="Learners with recorded learning evidence"
                icon={Activity}
                tone="sage"
              />
              <MetricCard
                label="Needs improvement"
                value={overview?.learnersWithNeedsImprovementCount ?? overview?.learnersNeedingAttentionCount ?? 0}
                supportingText="Learners with at least one topic flagged"
                icon={AlertTriangle}
                tone="signal"
              />
              <MetricCard
                label="Awaiting evidence"
                value={overview?.learnersAwaitingEvidenceCount ?? 0}
                supportingText="Not enough evidence to assess mastery"
                icon={Clock3}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">How to read these signals</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-secondary">
                  “Needs review” means the learner has demonstrated difficulty in one or more topics. “Awaiting evidence” means there is not enough recorded evidence to assess mastery yet; it does not mean the learner is struggling.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-elevated px-2.5 py-1.5 text-[11px] text-text-tertiary">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {analytics.course.totalTopicsCount} topics
              </span>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="learner-directory-title">
            <div className="space-y-4 border-b border-border-muted p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="learner-directory-title" className="text-lg font-semibold text-text-primary">Learner directory</h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    Search and review enrollment and learning evidence for {analytics.course.title}.
                  </p>
                </div>
                <p className="text-xs text-text-tertiary" aria-live="polite">
                  {totalItems} {totalItems === 1 ? 'learner' : 'learners'} found
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <label className="relative block w-full xl:max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search learner name or email"
                    aria-label="Search learners by name or email"
                    className="w-full rounded-xl border border-border bg-surface-elevated py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2" aria-label="Filter learners by enrollment status">
                  {FILTERS.map((filter) => {
                    const active = statusFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setStatusFilter(filter.value)}
                        className={[
                          'cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                          active
                            ? 'border-signal bg-signal-soft text-signal'
                            : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                        ].join(' ')}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isLoadingAnalytics ? (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2" aria-label="Updating learners" aria-busy="true">
                <LearnerSkeleton /><LearnerSkeleton />
              </div>
            ) : learners.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-text-secondary">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-semibold text-text-primary">
                  {debouncedSearch || statusFilter !== 'ALL' ? 'No matching learners' : 'No learners enrolled yet'}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                  {debouncedSearch || statusFilter !== 'ALL'
                    ? 'Try changing your search or enrollment filter.'
                    : 'Learners will appear here when they enroll in this course.'}
                </p>
                {(debouncedSearch || statusFilter !== 'ALL') && (
                  <Button size="sm" variant="secondary" className="mt-4" onClick={() => { setSearchInput(''); setDebouncedSearch(''); setStatusFilter('ALL'); setPage(1); }}>
                    Clear search and filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead className="bg-surface-elevated">
                      <tr className="border-b border-border-muted">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Learner</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Enrollment</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Topics mastered</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Avg. mastery</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Last recorded activity</th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Learning signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-muted">
                      {learners.map((learner) => (
                        <tr key={learner.learnerId} className="align-middle transition-colors hover:bg-surface-elevated/60">
                          <td className="px-5 py-4">
                            <Link
                              to={`/instructor/learners/${learner.learnerId}?courseId=${selectedCourseId}`}
                              className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              aria-label={`View ${learner.name}'s details in ${analytics.course.title}`}
                            >
                              <LearnerIdentity learner={learner} />
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                              {enrollmentLabel(learner.enrollmentStatus)}
                            </span>
                            <span className="mt-1.5 block text-[11px] text-text-tertiary">Since {formatDate(learner.enrolledAt)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold tabular-nums text-text-primary">{learner.masteredTopicsCount} / {analytics.course.totalTopicsCount}</p>
                            <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-surface-disabled">
                              <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(100, learner.progressPercentage)}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold tabular-nums text-text-primary">
                            {learner.averageMasteryScore === null ? <span className="font-normal text-text-tertiary">Not available</span> : `${learner.averageMasteryScore}%`}
                          </td>
                          <td className="px-4 py-4 text-xs text-text-secondary">{formatDate(learner.lastActiveAt)}</td>
                          <td className="px-5 py-4"><LearnerSignal learner={learner} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                  {learners.map((learner) => (
                    <LearnerCard
                      key={learner.learnerId}
                      learner={learner}
                      totalTopics={analytics.course.totalTopicsCount}
                      courseId={selectedCourseId}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-border-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-text-tertiary">
                {totalItems === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalItems)} of ${totalItems}`}
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1 || isLoadingAnalytics}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous
                </Button>
                <span className="min-w-20 text-center text-xs font-medium tabular-nums text-text-secondary">
                  Page {Math.min(page, totalPages)} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages || isLoadingAnalytics}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next<ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default InstructorLearnersPage;
