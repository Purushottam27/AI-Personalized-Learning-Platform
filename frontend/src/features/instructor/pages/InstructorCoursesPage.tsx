import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Archive,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  Globe,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import type { CourseDifficulty, CourseStatus, InstructorCourse } from '../types/instructor.types';

type StatusFilter = 'ALL' | CourseStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All courses' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

function formatDate(dateValue?: string): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDuration(course: InstructorCourse): string | null {
  const weeks = course.estimatedDuration?.weeks;
  const hours = course.estimatedDuration?.hours;
  const parts = [
    typeof weeks === 'number' && weeks > 0 ? `${weeks}w` : null,
    typeof hours === 'number' && hours > 0 ? `${hours}h` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : null;
}

const StatusBadge: React.FC<{ status: CourseStatus }> = ({ status }) => {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/20 bg-sage-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sage">
        <Globe className="h-3 w-3" aria-hidden="true" />
        Published
      </span>
    );
  }

  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/20 bg-signal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-signal">
        <FileText className="h-3 w-3" aria-hidden="true" />
        Draft
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-disabled px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
      <Archive className="h-3 w-3" aria-hidden="true" />
      Archived
    </span>
  );
};

const CourseSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-hidden="true">
    <div className="mb-5 flex items-center gap-2">
      <div className="h-6 w-20 rounded-full bg-surface-disabled" />
      <div className="h-4 w-24 rounded bg-surface-disabled" />
    </div>
    <div className="mb-3 h-6 w-3/4 rounded bg-surface-disabled" />
    <div className="mb-2 h-4 w-full rounded bg-surface-disabled" />
    <div className="mb-6 h-4 w-2/3 rounded bg-surface-disabled" />
    <div className="flex items-center justify-between border-t border-border-muted pt-4">
      <div className="h-4 w-28 rounded bg-surface-disabled" />
      <div className="h-9 w-32 rounded-lg bg-surface-disabled" />
    </div>
  </div>
);

const CourseCard: React.FC<{
  course: InstructorCourse;
  onOpen: (course: InstructorCourse) => void;
}> = ({ course, onOpen }) => {
  const duration = formatDuration(course);
  const lastUpdated = formatDate(course.updatedAt) ?? formatDate(course.createdAt);
  const actionLabel = course.status === 'DRAFT'
    ? 'Continue setup'
    : course.status === 'PUBLISHED'
      ? 'Manage course'
      : 'View course';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface transition-colors duration-200 hover:border-text-tertiary/50"
    >
      <div className="flex-1 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={course.status} />
          {course.difficulty && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
            </span>
          )}
        </div>

        <h2 className="break-words font-serif text-xl font-semibold leading-snug text-text-primary">
          {course.title}
        </h2>

        {course.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">
            {course.description}
          </p>
        )}

        {(course.domain || course.category || duration) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {course.domain && (
              <span className="rounded-md border border-border-muted bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">
                {course.domain}
              </span>
            )}
            {course.category && (
              <span className="rounded-md border border-border-muted bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">
                {course.category}
              </span>
            )}
            {duration && (
              <span className="rounded-md border border-border-muted bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">
                {duration}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {lastUpdated ? `Updated ${lastUpdated}` : 'Date unavailable'}
        </p>
        <Button
          variant={course.status === 'DRAFT' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onOpen(course)}
          className="w-full sm:w-auto"
        >
          {actionLabel}
        </Button>
      </div>
    </motion.article>
  );
};

const NoCoursesState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex min-h-[42vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center"
  >
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated">
      <BookOpen className="h-7 w-7 text-signal" strokeWidth={1.5} aria-hidden="true" />
    </div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
      Your course library
    </p>
    <h2 className="font-serif text-2xl font-semibold text-text-primary sm:text-3xl">
      No courses yet
    </h2>
    <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
      Create your first course and start building a learning experience for your learners.
    </p>
    <Button onClick={onCreate} className="mt-6">
      <Plus className="h-4 w-4" aria-hidden="true" />
      Create course
    </Button>
  </motion.div>
);

export const InstructorCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { courses, isLoading, error, refetch } = useInstructorCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    return courses.filter((course) => {
      const matchesStatus = statusFilter === 'ALL' || course.status === statusFilter;
      const searchableText = [
        course.title,
        course.description,
        course.domain,
        course.category,
        course.difficulty,
      ].filter(Boolean).join(' ').toLocaleLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [courses, searchQuery, statusFilter]);

  const handleOpenCourse = (course: InstructorCourse) => {
    if (course.status === 'DRAFT') {
      navigate(`/instructor/courses/${course._id}/setup`);
      return;
    }

    navigate(`/instructor/courses/${course._id}`);
  };

  const handleCreateCourse = () => navigate('/instructor/courses/create');
  const hasNoCourses = !isLoading && !error && courses.length === 0;
  const hasNoMatches = !isLoading && !error && courses.length > 0 && filteredCourses.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Instructor workspace
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            My Courses
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Find a course, continue a draft, or manage a learning experience you have already published.
          </p>
        </div>
        <Button onClick={handleCreateCourse} className="w-full shrink-0 sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create course
        </Button>
      </motion.header>

      {!isLoading && !error && courses.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
          aria-label="Search and filter courses"
          className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, domain, or category"
                aria-label="Search courses by title, domain, or category"
                className="w-full rounded-xl border border-border bg-surface-elevated py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2" aria-label="Filter by course status">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Status
              </span>
              {FILTERS.map((filter) => {
                const isActive = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(filter.value)}
                    className={[
                      'rounded-full border px-3 py-2 text-xs font-semibold transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      isActive
                        ? 'border-signal bg-signal-soft text-signal'
                        : 'border-border bg-surface text-text-secondary hover:border-text-tertiary hover:bg-surface-elevated hover:text-text-primary',
                    ].join(' ')}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-muted pt-3">
            <p className="text-xs text-text-secondary" aria-live="polite">
              Showing <span className="font-semibold text-text-primary">{filteredCourses.length}</span> of{' '}
              <span className="font-semibold text-text-primary">{courses.length}</span> courses
            </p>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-xs font-semibold text-signal transition-colors hover:text-signal-hover focus-visible:outline-none focus-visible:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.section>
      )}

      {isLoading && (
        <section aria-label="Loading courses" aria-busy="true" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => <CourseSkeleton key={index} />)}
        </section>
      )}

      {!isLoading && error && (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-2xl border border-error/20 bg-error-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-text-primary">Unable to load your courses</h2>
              <p className="mt-1 text-sm text-text-secondary">{error}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}

      {hasNoCourses && <NoCoursesState onCreate={handleCreateCourse} />}

      {hasNoMatches && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated">
            {statusFilter === 'ARCHIVED' ? (
              <Archive className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            ) : statusFilter === 'PUBLISHED' ? (
              <CheckCircle2 className="h-5 w-5 text-sage" aria-hidden="true" />
            ) : (
              <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            )}
          </div>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            {searchQuery ? 'No matching courses' : `No ${statusFilter.toLocaleLowerCase()} courses`}
          </h2>
          <p className="mt-2 max-w-md text-sm text-text-secondary">
            {searchQuery
              ? 'Try a different search term or clear your filters to see more courses.'
              : 'Courses with this status will appear here when available.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="mt-5"
          >
            Clear filters
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredCourses.length > 0 && (
        <section aria-label="Course list" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseCard key={course._id} course={course} onOpen={handleOpenCourse} />
          ))}
        </section>
      )}
    </div>
  );
};

// export default InstructorCoursesPage;
