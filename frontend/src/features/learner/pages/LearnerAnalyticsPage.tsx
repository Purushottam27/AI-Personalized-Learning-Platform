import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Flame,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useLearnerAnalytics } from '../hooks/useLearnerAnalytics';
import type { TopicMasteryAnalyticsItem } from '../types/learner.types';

const panelClass = 'rounded-2xl border border-border bg-surface';
const statusMeta: Record<string, { label: string; tone: string; description: string }> = {
  MASTERED: { label: 'Mastered', tone: 'bg-sage-soft text-sage', description: 'Strong, established mastery' },
  STRONG: { label: 'Strong', tone: 'bg-sage-soft text-sage', description: 'Strong current performance' },
  FUNCTIONAL: { label: 'Functional', tone: 'bg-surface-disabled text-text-secondary', description: 'Functional performance' },
  DEVELOPING: { label: 'Developing', tone: 'bg-amber-500/10 text-amber-600', description: 'Developing understanding' },
  NEEDS_IMPROVEMENT: { label: 'Needs improvement', tone: 'bg-signal-soft text-signal', description: 'More practice recommended' },
  INSUFFICIENT_EVIDENCE: { label: 'Awaiting evidence', tone: 'bg-surface-disabled text-text-secondary', description: 'Not enough eligible evidence yet' },
};

const formatDay = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

function TopicRow({ topic, rank }: { topic: TopicMasteryAnalyticsItem; rank: 'strength' | 'focus' }) {
  const status = statusMeta[topic.status] || statusMeta.INSUFFICIENT_EVIDENCE;
  const score = topic.masteryScore;
  return (
    <Link
      to={`/learner/courses/${topic.courseId}/learn?topicId=${encodeURIComponent(topic.topicId)}`}
      className="group flex items-center gap-3 rounded-xl border border-border-muted bg-surface-elevated p-3 transition-colors hover:border-signal/40 hover:bg-surface"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${rank === 'strength' ? 'bg-sage-soft text-sage' : 'bg-signal-soft text-signal'}`}>
        {rank === 'strength' ? <Award className="h-4 w-4" /> : <Target className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{topic.topicTitle}</p>
        <p className="mt-0.5 truncate text-xs text-text-tertiary">{topic.courseTitle} · {topic.evidenceCount} evidence {topic.evidenceCount === 1 ? 'record' : 'records'}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${status.tone}`}>{status.label}</span>
        {score !== null && <p className="mt-1 text-xs font-semibold tabular-nums text-text-secondary">{Math.round(score)} score</p>}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-signal" />
    </Link>
  );
}

export const LearnerAnalyticsPage: React.FC = () => {
  const { data, isLoading, error, days, setDays, refetch } = useLearnerAnalytics(7);

  const derived = useMemo(() => {
    if (!data) return null;
    const activeDays = data.dailyTrends.filter((item) => item.practiceCount + item.assessmentCount > 0).length;
    const totalSessionsInWindow = data.periodComparison.current.attempts;
    const current = data.periodComparison.current;
    const previous = data.periodComparison.previous;
    const accuracyDelta = current.accuracyPercent !== null && previous.accuracyPercent !== null
      ? current.accuracyPercent - previous.accuracyPercent
      : null;
    const topics = [...data.topicMasteryList];
    const strengths = topics
      .filter((topic) => ['MASTERED', 'STRONG'].includes(topic.status))
      .sort((a, b) => (b.masteryScore ?? -1) - (a.masteryScore ?? -1))
      .slice(0, 3);
    const focusTopics = topics
      .filter((topic) => ['NEEDS_IMPROVEMENT', 'DEVELOPING'].includes(topic.status))
      .sort((a, b) => (a.masteryScore ?? 101) - (b.masteryScore ?? 101))
      .slice(0, 3);
    const maxDailySessions = Math.max(1, ...data.dailyTrends.map((item) => item.practiceCount + item.assessmentCount));
    const distribution = [
      { key: 'MASTERED', label: 'Mastered', color: 'bg-sage' },
      { key: 'STRONG', label: 'Strong', color: 'bg-sage/60' },
      { key: 'FUNCTIONAL', label: 'Functional', color: 'bg-text-tertiary' },
      { key: 'DEVELOPING', label: 'Developing', color: 'bg-amber-500' },
      { key: 'NEEDS_IMPROVEMENT', label: 'Needs improvement', color: 'bg-signal' },
      { key: 'INSUFFICIENT_EVIDENCE', label: 'Awaiting evidence', color: 'bg-surface-disabled' },
    ].map((item) => ({ ...item, count: data.masteryDistribution[item.key as keyof typeof data.masteryDistribution] || 0 }));
    const totalTopics = distribution.reduce((sum, item) => sum + item.count, 0);
    return { activeDays, totalSessionsInWindow, current, previous, accuracyDelta, strengths, focusTopics, maxDailySessions, distribution, totalTopics };
  }, [data]);

  if (isLoading && !data) {
    return <div className="flex min-h-[60vh] w-full flex-col items-center justify-center"><Loader2 className="mb-4 h-8 w-8 animate-spin text-signal" /><p className="text-sm font-medium text-text-secondary">Building your learning picture...</p></div>;
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal"><AlertCircle className="h-7 w-7" /></div>
        <h2 className="mb-2 text-xl font-semibold text-text-primary">Your analytics could not be loaded</h2>
        <p className="mb-6 max-w-md text-sm text-text-secondary">{error}</p>
        <button onClick={refetch} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated"><RefreshCw className="h-4 w-4" /> Try again</button>
      </div>
    );
  }
  if (!data || !derived) return null;

  const { activityTotals, dailyTrends, courseProgressList } = data;
  const hasAnyEvidence = activityTotals.totalQuestionsAttempted > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal-soft/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-signal"><Brain className="h-3.5 w-3.5" /> Your learning intelligence</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Learning analytics</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">See what is improving, where your understanding is strongest, and which topics deserve your next study session.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-surface-elevated p-1 lg:self-auto">
          {[7, 14, 30].map((value) => <button key={value} onClick={() => setDays(value)} aria-pressed={days === value} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${days === value ? 'bg-signal text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{value} days</button>)}
          <button onClick={refetch} aria-label="Refresh analytics" className="ml-1 rounded-lg p-2 text-text-tertiary hover:bg-surface hover:text-text-primary"><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-signal/20 bg-signal-soft/40 px-4 py-3 text-xs text-text-secondary">The latest refresh failed. Showing the last successfully loaded analytics.</div>}

      <section className={`${panelClass} overflow-hidden`}>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <div className="p-5 sm:p-6"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Overall accuracy</span><Target className="h-4 w-4 text-signal" /></div><div className="font-display text-3xl font-bold tabular-nums text-text-primary">{hasAnyEvidence ? `${activityTotals.overallAccuracy}%` : '—'}</div><p className="mt-1 text-xs text-text-secondary">{activityTotals.totalQuestionsCorrect.toLocaleString()} correct of {activityTotals.totalQuestionsAttempted.toLocaleString()} eligible questions</p></div>
          <div className="p-5 sm:p-6"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Practice sessions</span><BookOpen className="h-4 w-4 text-signal" /></div><div className="font-display text-3xl font-bold tabular-nums text-text-primary">{activityTotals.totalPracticesCompleted.toLocaleString()}</div><p className="mt-1 text-xs text-text-secondary">Eligible completed practice sessions · all time</p></div>
          <div className="p-5 sm:p-6"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Assessments</span><Award className="h-4 w-4 text-sage" /></div><div className="font-display text-3xl font-bold tabular-nums text-text-primary">{activityTotals.totalAssessmentsCompleted.toLocaleString()}</div><p className="mt-1 text-xs text-text-secondary">Eligible submitted assessment attempts · all time</p></div>
          <div className="p-5 sm:p-6"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Active courses</span><Activity className="h-4 w-4 text-text-tertiary" /></div><div className="font-display text-3xl font-bold tabular-nums text-text-primary">{activityTotals.activeCoursesCount}</div><p className="mt-1 text-xs text-text-secondary">Courses with an active enrollment</p></div>
        </div>
      </section>

      {!hasAnyEvidence && (
        <section className={`${panelClass} border-dashed p-7 text-center sm:p-10`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal"><CircleHelp className="h-7 w-7" /></div>
          <h2 className="text-lg font-semibold text-text-primary">Your learning story starts here</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">There is not enough eligible practice or assessment evidence to calculate performance yet. Open a course and complete a practice session or submit an assessment. Simply opening a lesson or resource does not count as mastery evidence.</p>
          <Link to="/learner/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-2.5 text-sm font-semibold text-text-inverse hover:bg-signal/90">Go to my courses <ArrowRight className="h-4 w-4" /></Link>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className={`${panelClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">Performance movement</h2></div><p className="mt-1 text-xs text-text-secondary">This {days}-day window compared with the previous {days} days</p></div><span className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-[11px] font-medium text-text-tertiary">Equal periods</span></div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border-muted bg-surface-elevated p-4"><p className="text-xs text-text-tertiary">Current accuracy</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{derived.current.accuracyPercent === null ? '—' : `${derived.current.accuracyPercent}%`}</p><p className="mt-1 text-[11px] text-text-secondary">{derived.current.totalQuestions} questions</p></div>
            <div className="rounded-xl border border-border-muted bg-surface-elevated p-4"><p className="text-xs text-text-tertiary">Previous accuracy</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{derived.previous.accuracyPercent === null ? '—' : `${derived.previous.accuracyPercent}%`}</p><p className="mt-1 text-[11px] text-text-secondary">{derived.previous.totalQuestions} questions</p></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-muted px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">{derived.accuracyDelta === null ? <CircleHelp className="h-4 w-4 text-text-tertiary" /> : derived.accuracyDelta > 0 ? <ArrowUpRight className="h-4 w-4 text-sage" /> : derived.accuracyDelta < 0 ? <ArrowDownRight className="h-4 w-4 text-signal" /> : <Activity className="h-4 w-4 text-text-tertiary" />}{derived.accuracyDelta === null ? 'Not enough data to compare accuracy' : derived.accuracyDelta === 0 ? 'Accuracy is unchanged' : `${Math.abs(derived.accuracyDelta)} percentage-point ${derived.accuracyDelta > 0 ? 'increase' : 'decrease'}`}</div>
            <span className="text-[11px] text-text-tertiary">{derived.current.attempts} attempts now · {derived.previous.attempts} before</span>
          </div>
          {derived.accuracyDelta !== null && derived.current.totalQuestions > 0 && derived.previous.totalQuestions > 0 && <p className="mt-3 text-xs leading-5 text-text-secondary">This comparison uses question-weighted accuracy from eligible submitted evidence in two consecutive, equal-length periods. It describes performance movement, not a guarantee of long-term mastery.</p>}
          {(derived.current.totalQuestions === 0 || derived.previous.totalQuestions === 0) && <p className="mt-3 text-xs leading-5 text-text-secondary">A comparison becomes available when both periods contain eligible question evidence. No change is inferred from an empty period.</p>}
        </div>

        <div className={`${panelClass} p-5 sm:p-6`}>
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">Learning rhythm</h2></div>
          <p className="mt-1 text-xs text-text-secondary">Your activity across the selected period</p>
          <div className="mt-6 flex items-end justify-between gap-1.5" aria-label={`Activity on ${derived.activeDays} of ${days} days`}>
            {dailyTrends.map((item) => {
              const sessions = item.practiceCount + item.assessmentCount;
              const height = sessions === 0 ? 5 : Math.max(12, (sessions / derived.maxDailySessions) * 100);
              return <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${formatDay(item.date)}: ${item.practiceCount} practices, ${item.assessmentCount} assessments`}><div className="flex h-28 w-full items-end justify-center rounded-lg bg-surface-elevated px-1 pt-2"><div className={`w-full max-w-7 rounded-t-md ${sessions ? 'bg-signal' : 'bg-border'}`} style={{ height: `${height}%` }} /></div><span className="text-[9px] text-text-tertiary">{days > 14 ? new Date(`${item.date}T00:00:00`).getDate() : formatDay(item.date).split(' ')[0]}</span></div>;
            })}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4"><div><p className="text-2xl font-bold tabular-nums text-text-primary">{derived.activeDays}<span className="ml-1 text-sm font-medium text-text-tertiary">/ {days}</span></p><p className="text-xs text-text-secondary">Active days</p></div><div className="text-right"><p className="text-2xl font-bold tabular-nums text-text-primary">{derived.totalSessionsInWindow}</p><p className="text-xs text-text-secondary">Completed sessions</p></div></div>
        </div>
      </section>

      <section className={`${panelClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Brain className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">Your topic knowledge map</h2></div><p className="mt-1 text-xs text-text-secondary">Current mastery evidence across active, published courses</p></div><span className="text-xs text-text-tertiary">{derived.totalTopics} topics in view</span></div>
        {derived.totalTopics > 0 ? <>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-disabled" aria-label="Topic mastery distribution">{derived.distribution.filter((item) => item.count > 0).map((item) => <div key={item.key} className={item.color} style={{ width: `${(item.count / derived.totalTopics) * 100}%` }} title={`${item.label}: ${item.count}`} />)}</div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">{derived.distribution.map((item) => <div key={item.key} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.color}`} /><div className="min-w-0"><p className="text-xs font-semibold tabular-nums text-text-primary">{item.count}</p><p className="truncate text-[10px] text-text-tertiary">{item.label}</p></div></div>)}</div>
        </> : <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center"><p className="text-sm font-medium text-text-primary">No active course topics to map yet</p><p className="mt-1 text-xs text-text-secondary">Enroll in a published course to see topic-level mastery here.</p></div>}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-text-primary">Your strongest topics</h3><span className="text-[10px] font-semibold uppercase tracking-wider text-sage">Strengths</span></div>{derived.strengths.length ? <div className="space-y-2">{derived.strengths.map((topic) => <TopicRow key={topic.topicId} topic={topic} rank="strength" />)}</div> : <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-text-secondary">No topics have reached Strong or Mastered status yet. Keep building eligible evidence through practice and assessments.</div>}</div>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-text-primary">Topics to focus on</h3><span className="text-[10px] font-semibold uppercase tracking-wider text-signal">Study priorities</span></div>{derived.focusTopics.length ? <div className="space-y-2">{derived.focusTopics.map((topic) => <TopicRow key={topic.topicId} topic={topic} rank="focus" />)}</div> : <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-text-secondary">There are no evaluated topics currently marked Developing or Needs improvement. Topics awaiting evidence are shown separately and are not classified as weak.</div>}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className={`${panelClass} p-5 sm:p-6`}><div className="flex items-center gap-2"><Target className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">What your evidence suggests</h2></div><p className="mt-1 text-xs text-text-secondary">Actionable observations based only on recorded learning evidence</p><div className="mt-4 space-y-3">
          {derived.accuracyDelta !== null && derived.current.totalQuestions > 0 && derived.previous.totalQuestions > 0 && <div className="flex gap-3 rounded-xl border border-border-muted bg-surface-elevated p-3.5"><div className={`mt-0.5 ${derived.accuracyDelta >= 0 ? 'text-sage' : 'text-signal'}`}>{derived.accuracyDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}</div><div><p className="text-sm font-semibold text-text-primary">{derived.accuracyDelta > 0 ? 'Your accuracy improved' : derived.accuracyDelta < 0 ? 'Your accuracy dipped' : 'Your accuracy held steady'}</p><p className="mt-1 text-xs leading-5 text-text-secondary">{Math.abs(derived.accuracyDelta)} percentage points compared with the previous {days}-day period. Review the topics and question types from your recent attempts to understand the change.</p></div></div>}
          {derived.focusTopics.length > 0 && <div className="flex gap-3 rounded-xl border border-border-muted bg-surface-elevated p-3.5"><div className="mt-0.5 text-signal"><Target className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-text-primary">Give {derived.focusTopics[0].topicTitle} another focused session</p><p className="mt-1 text-xs leading-5 text-text-secondary">Its current status is {statusMeta[derived.focusTopics[0].status]?.label || 'Developing'}. Revisit the topic and use targeted practice to build more evidence.</p><Link to={`/learner/courses/${derived.focusTopics[0].courseId}/learn?topicId=${encodeURIComponent(derived.focusTopics[0].topicId)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline">Review this topic <ArrowRight className="h-3 w-3" /></Link></div></div>}
          {derived.strengths.length > 0 && <div className="flex gap-3 rounded-xl border border-border-muted bg-surface-elevated p-3.5"><div className="mt-0.5 text-sage"><CheckCircle2 className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-text-primary">Build on an established strength</p><p className="mt-1 text-xs leading-5 text-text-secondary">{derived.strengths[0].topicTitle} currently has {statusMeta[derived.strengths[0].status]?.label || 'strong'} mastery evidence. Use it as a foundation when approaching related topics.</p></div></div>}
          {derived.activeDays === 0 && <div className="flex gap-3 rounded-xl border border-border-muted bg-surface-elevated p-3.5"><div className="mt-0.5 text-text-tertiary"><Clock3 className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-text-primary">No eligible sessions in this window</p><p className="mt-1 text-xs leading-5 text-text-secondary">Complete a practice session or submit an assessment to create a recent performance signal. Lesson and resource views remain engagement activity, not mastery evidence.</p></div></div>}
          {derived.current.attempts === 0 && derived.previous.attempts === 0 && derived.focusTopics.length === 0 && derived.strengths.length === 0 && <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-text-secondary">There is not yet enough evidence to generate a personalized performance observation. Continue learning and check back after eligible attempts are recorded.</div>}
        </div></div>
        <div className={`${panelClass} p-5 sm:p-6`}><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">Course progression</h2></div><p className="mt-1 text-xs text-text-secondary">Topics with Strong or Mastered evidence, out of each active course curriculum</p>{courseProgressList.length ? <div className="mt-5 space-y-4">{courseProgressList.map((course) => <Link key={course.courseId} to={`/learner/courses/${course.courseId}/learn`} className="group block rounded-xl border border-border-muted bg-surface-elevated p-4 transition-colors hover:border-signal/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{course.courseTitle}</p>{course.domain && <p className="mt-0.5 text-xs text-text-tertiary">{course.domain}</p>}</div><span className="shrink-0 text-sm font-bold tabular-nums text-text-primary">{course.progressPercentage}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-disabled"><div className="h-full rounded-full bg-signal transition-all" style={{ width: `${clampPercent(course.progressPercentage)}%` }} /></div><div className="mt-2 flex items-center justify-between text-[11px] text-text-tertiary"><span>{course.masteredTopics} of {course.totalTopics} topics Strong or Mastered</span><span>{course.evaluatedTopics} evaluated</span></div></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center"><p className="text-sm font-medium text-text-primary">No active published courses</p><Link to="/learner/explore" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline">Explore courses <ArrowRight className="h-3 w-3" /></Link></div>}</div>
      </section>

      <section className={`${panelClass} p-5 sm:p-6`}><div className="flex items-center gap-2"><Flame className="h-5 w-5 text-signal" /><h2 className="text-base font-semibold text-text-primary">Daily learning activity</h2></div><p className="mt-1 text-xs text-text-secondary">Completed eligible practice and assessment activity in the selected {days}-day period</p><div className="mt-4 overflow-x-auto"><div className="min-w-[620px]"><div className="grid grid-cols-[100px_1fr_1fr_90px] gap-3 border-b border-border px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary"><span>Day</span><span>Practice</span><span>Assessment</span><span className="text-right">Questions</span></div>{dailyTrends.map((item) => <div key={item.date} className="grid grid-cols-[100px_1fr_1fr_90px] items-center gap-3 border-b border-border-muted px-2 py-3 last:border-0"><span className="text-xs font-medium text-text-secondary">{formatDay(item.date)}</span><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-disabled"><div className="h-full rounded-full bg-signal" style={{ width: `${item.practiceCount ? Math.max(5, (item.practiceCount / derived.maxDailySessions) * 100) : 0}%` }} /></div><span className="w-5 text-right text-xs tabular-nums text-text-secondary">{item.practiceCount}</span></div><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-disabled"><div className="h-full rounded-full bg-sage" style={{ width: `${item.assessmentCount ? Math.max(5, (item.assessmentCount / derived.maxDailySessions) * 100) : 0}%` }} /></div><span className="w-5 text-right text-xs tabular-nums text-text-secondary">{item.assessmentCount}</span></div><span className="text-right text-xs tabular-nums text-text-secondary">{item.totalQuestions}</span></div>)}</div></div><div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-text-tertiary"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-signal" /> Practice sessions</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sage" /> Assessment attempts</span></div></section>

      <p className="px-1 text-[11px] leading-5 text-text-tertiary">How to read this page: performance metrics use only evidence explicitly marked as eligible for learning evidence. Topic mastery is calculated by the platform's mastery engine from eligible evidence; opening lessons or resources does not increase mastery. “Awaiting evidence” means there is not enough eligible evidence to assess a topic, not that you are struggling.</p>
    </div>
  );
};
