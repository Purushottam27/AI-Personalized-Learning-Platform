import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, BookOpen, ChevronLeft, ChevronRight, GraduationCap,
  RefreshCw, Search, Users, UserRound,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useInstructorLearnersOverview } from '../hooks/useInstructorLearnersOverview';
import type {
  InstructorLearnersOverviewCourse,
  InstructorLearnersOverviewLearner,
} from '../types/learners-overview.types';

const PAGE_SIZE = 20;

const Metric: React.FC<{ label: string; value: number; detail: string; icon: React.ElementType }> = ({
  label, value, detail, icon: Icon,
}) => (
  <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-elevated text-text-secondary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-3 font-display text-3xl font-semibold leading-none tabular-nums text-text-primary">{value}</p>
    <p className="mt-2 text-xs text-text-tertiary">{detail}</p>
  </article>
);

const statusText = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const dateText = (value: string | null) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
};
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'L';

const CourseRow: React.FC<{ course: InstructorLearnersOverviewCourse }> = ({ course }) => (
  <article className="rounded-xl border border-border-muted bg-surface-elevated/50 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-text-primary">{course.title}</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          {[course.domain, course.category, course.difficulty, course.status.toLowerCase()].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {course.totalEnrollments} {course.totalEnrollments === 1 ? 'enrollment' : 'enrollments'}
      </span>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
      <span>{course.enrollmentBreakdown.active} active</span>
      <span>{course.enrollmentBreakdown.completed} completed</span>
      <span>{course.enrollmentBreakdown.withdrawn} withdrawn</span>
    </div>
  </article>
);

const LearnerRow: React.FC<{ learner: InstructorLearnersOverviewLearner }> = ({ learner }) => (
  <article className="rounded-xl border border-border-muted p-4">
    <div className="flex items-start gap-3">
      {learner.avatar ? (
        <img src={learner.avatar} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full border border-border object-cover" />
      ) : (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text-secondary">
          {initials(learner.name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{learner.name}</p>
        <p className="truncate text-xs text-text-secondary">{learner.email || 'Email unavailable'}</p>
        <p className="mt-1 text-[11px] text-text-tertiary">
          {learner.coursesCount} associated {learner.coursesCount === 1 ? 'course' : 'courses'} · Account {statusText(learner.accountStatus)}
        </p>
      </div>
    </div>
    <div className="mt-4 space-y-2 border-t border-border-muted pt-3">
      {learner.courses.map((course) => (
        <div key={course.courseId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text-primary">{course.courseTitle}</p>
            <p className="mt-0.5 text-[11px] text-text-tertiary">Enrolled {dateText(course.enrolledAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              {statusText(course.enrollmentStatus)}
            </span>
            <Link
              to={`/instructor/learners/${learner.learnerId}?courseId=${course.courseId}`}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-signal outline-none hover:bg-signal-soft focus-visible:ring-2 focus-visible:ring-focus"
            >
              View course details
            </Link>
          </div>
        </div>
      ))}
    </div>
  </article>
);

export const InstructorAllCoursesLearnersOverview: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(1), [search]);

  const { data, isLoading, error, refetch } = useInstructorLearnersOverview({
    page, limit: PAGE_SIZE, search,
  });

  const overview = data?.overview;
  const courses = data?.courses ?? [];
  const learners = data?.learners.items ?? [];
  const pagination = data?.learners.pagination;
  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="flex flex-col gap-4 border-b border-border-muted pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Instructor workspace</p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">All courses</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            A consolidated view of your course enrollments and unique learners. Learning mastery remains scoped to each course.
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}><BookOpen className="h-4 w-4" aria-hidden="true" />Course view</Button>
      </header>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error-soft/40 p-6" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold text-text-primary">Unable to load the all-courses overview</h2>
              <p className="mt-1 text-sm text-text-secondary">{error}</p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => void refetch()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />Try again
              </Button>
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="All courses overview">
            <Metric label="Courses" value={overview?.totalCourses ?? 0} detail="Courses owned by you" icon={BookOpen} />
            <Metric label="Learner-course enrollments" value={overview?.totalEnrollments ?? 0} detail={`${overview?.enrollmentBreakdown.active ?? 0} active · ${overview?.enrollmentBreakdown.completed ?? 0} completed · ${overview?.enrollmentBreakdown.withdrawn ?? 0} withdrawn`} icon={GraduationCap} />
            <Metric label="Unique learners" value={overview?.uniqueLearnersCount ?? 0} detail="Each learner counted once across your courses" icon={Users} />
          </section>

          <section className="space-y-3" aria-labelledby="all-course-directory-title">
            <div>
              <h2 id="all-course-directory-title" className="text-lg font-semibold text-text-primary">Course directory</h2>
              <p className="mt-1 text-xs text-text-secondary">Enrollment counts use one authoritative record per learner and course.</p>
            </div>
            {courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-text-secondary">No courses found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{courses.map((course) => <CourseRow key={course.courseId} course={course} />)}</div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="all-learner-directory-title">
            <div className="space-y-3 border-b border-border-muted p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="all-learner-directory-title" className="text-lg font-semibold text-text-primary">Unique learner directory</h2>
                  <p className="mt-1 text-xs text-text-secondary">Each learner appears once, with every associated course listed below.</p>
                </div>
                <p className="text-xs text-text-tertiary" aria-live="polite">{totalItems} {totalItems === 1 ? 'learner' : 'learners'} found</p>
              </div>
              <label className="relative block w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search learner name or email"
                  aria-label="Search learners by name or email"
                  className="w-full rounded-xl border border-border bg-surface-elevated py-3 pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
                />
              </label>
            </div>

            {isLoading ? (
              <div className="space-y-3 p-4" aria-busy="true"><div className="h-24 animate-pulse rounded-xl bg-surface-elevated" /><div className="h-24 animate-pulse rounded-xl bg-surface-elevated" /></div>
            ) : learners.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <UserRound className="mb-3 h-6 w-6 text-text-tertiary" aria-hidden="true" />
                <p className="text-sm font-semibold text-text-primary">{search ? 'No matching learners' : 'No learners enrolled yet'}</p>
                <p className="mt-1 text-xs text-text-secondary">{search ? 'Try another name or email.' : 'Learners will appear here when they enroll in one of your courses.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">{learners.map((learner) => <LearnerRow key={learner.learnerId} learner={learner} />)}</div>
            )}

            <div className="flex flex-col gap-3 border-t border-border-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-text-tertiary">
                {totalItems === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalItems)} of ${totalItems}`}
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Button size="sm" variant="secondary" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous
                </Button>
                <span className="min-w-20 text-center text-xs font-medium tabular-nums text-text-secondary">Page {Math.min(page, totalPages)} of {totalPages}</span>
                <Button size="sm" variant="secondary" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
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

export default InstructorAllCoursesLearnersOverview;
