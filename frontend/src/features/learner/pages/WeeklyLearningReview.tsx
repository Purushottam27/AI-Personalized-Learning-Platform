import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, CheckCircle2, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { getWeeklyLearningReview } from '../api/weeklyLearningReview.api';
import type { ReviewPerformance, WeeklyLearningReview as ReviewData } from '../types/weeklyLearningReview.types';

interface Props { planId: string; }

const Metric: React.FC<{ label: string; value: string | number; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-border bg-surface p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    {detail && <p className="mt-1 text-xs text-text-tertiary">{detail}</p>}
  </div>
);

const PerformancePanel: React.FC<{ title: string; data: ReviewPerformance; empty: boolean }> = ({ title, data, empty }) => (
  <section className="rounded-2xl border border-border bg-surface p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-text-primary">{title}</h3><span className="text-xs text-text-tertiary">{data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}</span></div>
    {empty ? <p className="mt-4 text-sm text-text-secondary">No eligible {title.toLowerCase()} evidence was recorded during this plan period.</p> : <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Questions" value={data.questionsAttempted} />
        <Metric label="Correct" value={data.questionsCorrect} />
        <Metric label="Accuracy" value={data.accuracyPercent == null ? '—' : `${data.accuracyPercent}%`} />
        <Metric label="Average score" value={data.averageScorePercent == null ? '—' : `${data.averageScorePercent}%`} />
      </div>
      {title === 'Assessments' && <p className="mt-3 text-xs text-text-secondary">Passed: {data.passedAssessments} · Not passed: {data.failedAssessments} · Diagnostic: {data.assessmentSubtypes.DIAGNOSTIC} · Topic: {data.assessmentSubtypes.TOPIC} · Final: {data.assessmentSubtypes.FINAL}</p>}
    </>}
  </section>
);

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const WeeklyLearningReview: React.FC<Props> = ({ planId }) => {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReview = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReview(await getWeeklyLearningReview(planId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load the weekly learning review.'); }
    finally { setLoading(false); }
  }, [planId]);

  useEffect(() => { void loadReview(); }, [loadReview]);

  if (loading) return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-text-secondary"><RefreshCw className="h-5 w-5 animate-spin text-signal" /> Loading your evidence-based weekly review…</div>;
  if (error) return <div className="rounded-2xl border border-border bg-surface p-6 text-center"><AlertCircle className="mx-auto mb-3 h-6 w-6 text-error" /><h3 className="font-semibold text-text-primary">Weekly review unavailable</h3><p className="my-3 text-sm text-text-secondary">{error}</p><button onClick={() => void loadReview()} className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;
  if (!review) return null;

  const week = review.learningWeek;
  const topics = review.topicUnderstanding.topics;
  const activities = week.activities ?? [];
  const comparison = review.comparison;

  return <div className="space-y-5">
    <header className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-sage" /><h2 className="font-display text-lg font-semibold text-text-primary">Weekly learning review</h2></div><p className="mt-2 text-sm text-text-secondary">A review of recorded learning evidence for {formatDate(review.plan.startDate)} – {formatDate(review.plan.endDate)}.</p><p className="mt-1 text-xs text-text-tertiary">Plan v{review.plan.version} · Calendar timezone: {review.plan.timeZone}</p></div>
        <button onClick={() => void loadReview()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:border-signal"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Scheduled" value={week.scheduledActivities} />
        <Metric label="Completed" value={week.completedActivities} />
        <Metric label="Pending" value={week.pendingActivities} />
        <Metric label="Overdue" value={week.overdueActivities} />
        <Metric label="Active days" value={`${week.activeLearningDays}/7`} />
        <Metric label="Completion" value={`${week.completionPercentage ?? 0}%`} />
      </div>
    </header>

    <div className="grid gap-5 lg:grid-cols-2">
      <PerformancePanel title="Practice" data={review.performance.practice} empty={review.performance.practice.sessions === 0} />
      <PerformancePanel title="Assessments" data={review.performance.assessments} empty={review.performance.assessments.sessions === 0} />
    </div>

    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2"><Target className="h-5 w-5 text-signal" /><h3 className="text-sm font-bold text-text-primary">Topic understanding</h3></div>
      <p className="mt-1 text-xs text-text-secondary">Mastery is recalculated from eligible evidence available through this plan’s end date. Topics without sufficient evidence are not assigned a score.</p>
      {topics.length ? <div className="mt-4 divide-y divide-border">{topics.map(topic => <div key={topic.topicId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-semibold text-text-primary">{topic.topicTitle}</p><p className="mt-1 text-xs text-text-tertiary">{topic.status.replaceAll('_', ' ')} · {topic.evidenceCount} evidence records · {topic.questionsAttempted} questions</p></div>
        <div className="sm:text-right"><p className="text-sm font-bold text-text-primary">{topic.masteryScore == null ? 'Insufficient evidence' : `${topic.masteryScore}% mastery`}</p><p className="text-xs text-text-tertiary">{topic.confidence == null ? 'Confidence unavailable' : `${topic.confidence} confidence`}</p></div>
      </div>)}</div> : <p className="mt-4 text-sm text-text-secondary">No topics were associated with this plan’s courses.</p>}
      <p className="mt-3 text-xs text-text-tertiary">Evidence records considered through the plan end date: {review.topicUnderstanding.evidenceCount}.</p>
    </section>

    {review.attentionItems.length > 0 && <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5"><h3 className="text-sm font-bold text-text-primary">Needs attention</h3><div className="mt-3 space-y-2">{review.attentionItems.map((item, index) => <p key={`${item.type}-${index}`} className="text-sm text-text-secondary">{item.message}</p>)}</div></section>}

    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary"><BookOpenCheck className="h-4 w-4 text-sage" /> Scheduled activity outcomes</h3>
      {activities.length ? <div className="mt-3 divide-y divide-border">{activities.map(activity => <div key={activity.activityId} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-medium text-text-primary">{activity.title}</p><p className="text-xs text-text-tertiary">{activity.activityType} · {formatDate(activity.scheduledDate)}{activity.topicTitle ? ` · ${activity.topicTitle}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${activity.completionStatus === 'COMPLETED' ? 'bg-sage-soft text-sage' : activity.completionStatus === 'SUBMITTED_NOT_PASSED' ? 'bg-amber-500/10 text-amber-700' : 'bg-surface-elevated text-text-secondary'}`}>{activity.completionStatus.replaceAll('_', ' ')}</span></div>)}</div> : <p className="mt-3 text-sm text-text-secondary">No scheduled activities are available in this plan.</p>}
    </section>

    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-bold text-text-primary">Next steps</h3>
      <div className="mt-3 space-y-3">{review.nextSteps.map((step, index) => <div key={`${step.type}-${index}`} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-bold text-text-secondary">{index + 1}</span><div><p className="text-sm font-semibold text-text-primary">{step.title}</p><p className="mt-1 text-xs text-text-secondary">{step.reason}</p></div></div>)}</div>
    </section>

    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-bold text-text-primary">Previous-week comparison</h3>
      {comparison.available && comparison.previousPeriod ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface-elevated p-4"><p className="text-xs text-text-tertiary">Current period · {formatDate(comparison.currentPeriod.startDate)} – {formatDate(comparison.currentPeriod.endDate)}</p><p className="mt-2 text-lg font-bold text-text-primary">{comparison.currentPeriod.performance.accuracyPercent == null ? '—' : `${comparison.currentPeriod.performance.accuracyPercent}% accuracy`}</p><p className="text-xs text-text-secondary">{comparison.currentPeriod.performance.sessions} evidence sessions</p></div><div className="rounded-xl bg-surface-elevated p-4"><p className="text-xs text-text-tertiary">Previous period · {formatDate(comparison.previousPeriod.startDate)} – {formatDate(comparison.previousPeriod.endDate)}</p><p className="mt-2 text-lg font-bold text-text-primary">{comparison.previousPeriod.performance.accuracyPercent == null ? '—' : `${comparison.previousPeriod.performance.accuracyPercent}% accuracy`}</p><p className="text-xs text-text-secondary">{comparison.previousPeriod.performance.sessions} evidence sessions</p></div></div> : <p className="mt-3 text-sm text-text-secondary">{comparison.reason || 'There is not enough eligible evidence in both periods to make a comparison.'}</p>}
    </section>
    <p className="text-xs text-text-tertiary"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Performance metrics use eligible recorded learning evidence. Scheduled activity completion is shown separately from mastery and assessment performance.</p>
  </div>;
};
