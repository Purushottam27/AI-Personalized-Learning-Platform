import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  RefreshCw,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useInstructorCourseLearnerDetails } from '../hooks/useInstructorCourseLearnerDetails';
import type {
  InstructorLearnerAssessmentAttempt,
  InstructorLearnerTopicDetail,
} from '../types/analytics.types';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'L';
}

function enrollmentTone(status: string): string {
  if (status === 'ACTIVE') return 'border-sage/25 bg-sage-soft text-sage';
  if (status === 'COMPLETED') return 'border-border bg-surface-elevated text-text-secondary';
  return 'border-signal/20 bg-signal-soft text-signal';
}

function masteryLabel(status: InstructorLearnerTopicDetail['status']): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function masteryTone(status: InstructorLearnerTopicDetail['status']): string {
  if (['STRONG', 'MASTERED', 'FUNCTIONAL'].includes(status)) return 'text-sage bg-sage-soft';
  if (status === 'NEEDS_IMPROVEMENT') return 'text-signal bg-signal-soft';
  if (status === 'DEVELOPING') return 'text-text-primary bg-surface-elevated';
  return 'text-text-tertiary bg-surface-elevated';
}

const Metric: React.FC<{
  label: string;
  value: string | number;
  caption: string;
  icon: React.ElementType;
}> = ({ label, value, caption, icon: Icon }) => (
  <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-elevated text-text-secondary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-text-primary">{value}</p>
    <p className="mt-2 text-xs text-text-tertiary">{caption}</p>
  </article>
);

const TopicRow: React.FC<{ topic: InstructorLearnerTopicDetail }> = ({ topic }) => (
  <div className="grid grid-cols-1 gap-3 border-b border-border-muted py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-[10px] font-semibold text-text-tertiary">
          {topic.order}
        </span>
        <h3 className="truncate text-sm font-semibold text-text-primary">{topic.title}</h3>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-8 text-[11px] text-text-tertiary">
        <span>{topic.evidenceCount} evidence records</span>
        <span>{topic.practiceAttemptsCount} practice attempts</span>
        <span>{topic.assessmentAttemptsCount} assessment attempts</span>
        <span>Last evaluated {formatDate(topic.lastEvaluatedAt)}</span>
      </div>
    </div>
    <div className="flex items-center gap-3 pl-8 sm:pl-0">
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${masteryTone(topic.status)}`}>
        {masteryLabel(topic.status)}
      </span>
      <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-text-primary">
        {topic.masteryScore === null ? '—' : `${topic.masteryScore}%`}
      </span>
    </div>
  </div>
);

const AttemptRow: React.FC<{ attempt: InstructorLearnerAssessmentAttempt }> = ({ attempt }) => {
  const evaluated = attempt.scorePercent !== null;
  return (
    <div className="flex flex-col gap-3 border-b border-border-muted py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{attempt.assessmentTitle}</h3>
          <span className="rounded-md bg-surface-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            {attempt.assessmentType}
          </span>
          {attempt.topicTitle && (
            <span className="text-xs text-text-tertiary">{attempt.topicTitle}</span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-tertiary">
          Attempt {attempt.attemptNumber} · Started {formatDate(attempt.startedAt)}
          {attempt.submittedAt ? ` · Submitted ${formatDate(attempt.submittedAt)}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {evaluated ? (
          <>
            <span className="text-sm font-semibold tabular-nums text-text-primary">{attempt.scorePercent}%</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${attempt.passed ? 'bg-sage-soft text-sage' : 'bg-signal-soft text-signal'}`}>
              {attempt.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {attempt.passed ? 'Passed' : 'Not passed'}
            </span>
          </>
        ) : (
          <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            {attempt.status === 'IN_PROGRESS' ? 'In progress' : 'Awaiting evaluation'}
          </span>
        )}
      </div>
    </div>
  );
};

export const InstructorLearnerDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { learnerId } = useParams<{ learnerId: string }>();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');

  const { details, isLoading, error, refetch } = useInstructorCourseLearnerDetails(courseId, learnerId ?? null);

  if (!courseId || !learnerId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-7 text-center">
        <h1 className="text-lg font-semibold text-text-primary">Course context is missing</h1>
        <p className="mt-2 text-sm text-text-secondary">Return to the learner directory and open a learner from a selected course.</p>
        <Button className="mt-4" onClick={() => navigate('/instructor/learners')}>Back to learners</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse space-y-5" aria-busy="true">
        <div className="h-8 w-40 rounded bg-surface-disabled" />
        <div className="h-36 rounded-2xl border border-border bg-surface" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-2xl border border-border bg-surface" />)}
        </div>
        <div className="h-72 rounded-2xl border border-border bg-surface" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-error/20 bg-error-soft/40 p-6 sm:p-8" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-text-primary">Unable to load learner details</h1>
            <p className="mt-1 text-sm text-text-secondary">{error || 'No learner details were returned.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void refetch()}>
                <RefreshCw className="h-4 w-4" />Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/instructor/learners?courseId=${courseId}`)}>
                Back to directory
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { learner, course, enrollment, overview, topics, assessmentAttempts, recentActivity } = details;
  const masteredPercent = overview.totalTopics > 0
    ? Math.round((overview.masteredTopicsCount / overview.totalTopics) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <div>
        <Link
          to={`/instructor/learners?courseId=${course.courseId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary transition-colors hover:text-signal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {course.title} learners
        </Link>
      </div>

      <header className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {learner.avatar ? (
              <img src={learner.avatar} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover" />
            ) : (
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-lg font-semibold text-text-secondary">
                {initials(learner.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Learner profile · {course.title}</p>
              <h1 className="mt-1 truncate font-serif text-2xl font-semibold text-text-primary sm:text-3xl">{learner.name}</h1>
              <p className="mt-1 truncate text-sm text-text-secondary">{learner.email || 'Email unavailable'}</p>
            </div>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${enrollmentTone(enrollment.status)}`}>
            {enrollment.status.charAt(0) + enrollment.status.slice(1).toLowerCase()} enrollment
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border-muted pt-4 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Enrolled {formatDate(enrollment.enrolledAt)}</span>
          {enrollment.completedAt && <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Completed {formatDate(enrollment.completedAt)}</span>}
          {enrollment.withdrawnAt && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Withdrawn {formatDate(enrollment.withdrawnAt)}</span>}
        </div>
      </header>

      <section aria-label="Learner course summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Average topic mastery" value={overview.averageMasteryScore === null ? '—' : `${overview.averageMasteryScore}%`} caption="Average of evaluated topic scores" icon={Target} />
        <Metric label="Topics mastered" value={`${overview.masteredTopicsCount} / ${overview.totalTopics}`} caption={`${masteredPercent}% of course topics`} icon={GraduationCap} />
        <Metric label="Learning evidence" value={overview.totalEvidenceCount} caption="Recorded practice and assessment evidence" icon={Activity} />
        <Metric label="Assessment attempts" value={overview.totalAssessmentAttempts} caption={`${overview.evaluatedAssessmentAttemptsCount} evaluated attempts`} icon={FileCheck2} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="topic-mastery-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="topic-mastery-title" className="text-lg font-semibold text-text-primary">Topic mastery</h2>
            <p className="mt-1 text-xs text-text-secondary">Mastery is calculated independently for this learner in this course.</p>
          </div>
          <span className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-[11px] text-text-tertiary">{topics.length} topics</span>
        </div>
        {topics.length > 0 ? (
          <div className="mt-3">
            {topics.map((topic) => <TopicRow key={topic.topicId} topic={topic} />)}
          </div>
        ) : (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-text-tertiary" />
            <p className="mt-2 text-sm font-medium text-text-primary">No topics in this course yet</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="assessment-history-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="assessment-history-title" className="text-lg font-semibold text-text-primary">Assessment history</h2>
            <p className="mt-1 text-xs text-text-secondary">Latest attempts in this course. Question responses and answer keys are not displayed here.</p>
          </div>
          <span className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-[11px] text-text-tertiary">
            {details.assessmentAttemptPagination.totalItems} attempts
          </span>
        </div>
        {assessmentAttempts.length > 0 ? (
          <div className="mt-2">
            {assessmentAttempts.map((attempt) => <AttemptRow key={attempt.attemptId} attempt={attempt} />)}
            {details.assessmentAttemptPagination.hasMore && (
              <p className="mt-3 border-t border-border-muted pt-3 text-xs text-text-tertiary">
                Showing the latest {details.assessmentAttemptPagination.returnedItems} of {details.assessmentAttemptPagination.totalItems} attempts.
              </p>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <FileCheck2 className="mx-auto h-7 w-7 text-text-tertiary" />
            <p className="mt-2 text-sm font-medium text-text-primary">No assessment attempts recorded</p>
            <p className="mt-1 text-xs text-text-tertiary">Attempts will appear here after the learner starts an assessment in this course.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="recent-activity-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="recent-activity-title" className="text-lg font-semibold text-text-primary">Recent learning activity</h2>
            <p className="mt-1 text-xs text-text-secondary">Latest recorded learning evidence for this course.</p>
          </div>
          <span className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-[11px] text-text-tertiary">
            {details.activityPagination.totalItems} total records
          </span>
        </div>
        {recentActivity.length > 0 ? (
          <div className="mt-3 divide-y divide-border-muted">
            {recentActivity.map((activity) => (
              <div key={activity.evidenceId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-text-secondary">
                    {activity.sourceType === 'ASSESSMENT' ? <FileCheck2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{activity.title}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {activity.topicTitle || 'Course-level activity'} · {formatDate(activity.completedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 pl-11 sm:pl-0">
                  <span className="text-xs font-semibold tabular-nums text-text-primary">{activity.scorePercent}%</span>
                  <span className="text-[11px] text-text-tertiary">{activity.correctCount === null ? `${activity.marksAwarded}/${activity.totalMarks} marks` : `${activity.correctCount}/${activity.totalQuestions} correct`}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <UserRound className="mx-auto h-7 w-7 text-text-tertiary" />
            <p className="mt-2 text-sm font-medium text-text-primary">No learning evidence recorded yet</p>
            <p className="mt-1 text-xs text-text-tertiary">This is an evidence gap, not an indication of poor performance.</p>
          </div>
        )}
        {details.activityPagination.hasMore && (
          <p className="mt-3 border-t border-border-muted pt-3 text-xs text-text-tertiary">
            Showing the latest {details.activityPagination.returnedItems} of {details.activityPagination.totalItems} records.
          </p>
        )}
      </section>
    </div>
  );
};

export default InstructorLearnerDetailPage;
