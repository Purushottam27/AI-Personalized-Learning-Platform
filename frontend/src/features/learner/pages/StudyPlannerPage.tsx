import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle,  CheckCircle2, Clock3, RefreshCw, Settings2, Sparkles, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudyPlan } from '../hooks/useStudyPlan';
import type { ScheduledActivity, StudyPreferences } from '../types/studyPlan.types';
import { WeeklyLearningReview } from './WeeklyLearningReview';
type Tab = 'WEEK' | 'TODAY' | 'REVIEW' | 'PREFERENCES';
const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const TRACKABLE_TYPES = new Set(['PRACTICE', 'ASSESSMENT', 'TOPIC_REVIEW']);
const isTrackableActivity = (activity: ScheduledActivity) => TRACKABLE_TYPES.has(activity.activityType);

const formatCalendarDate = (value: string) => {
  if (!value) return 'Date unavailable';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const ActivityCard: React.FC<{ activity: ScheduledActivity; compact?: boolean; recommended?: boolean }> = ({ activity, compact = false, recommended = false }) => {
  const completed = isTrackableActivity(activity) && Boolean(activity.isCompleted);
  const untracked = !isTrackableActivity(activity);
  const pendingPast = !completed && !untracked && activity.temporalStatus === 'PAST';
  const status = completed
    ? 'Completed from recorded evidence'
    : untracked
      ? 'Self-paced · completion not tracked'
      : pendingPast
        ? 'Overdue · scheduled earlier'
        : activity.temporalStatus === 'TODAY'
          ? 'Scheduled today'
          : 'Scheduled';

  return (
    <article className={`flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
      recommended ? 'border-signal/40 bg-signal-soft/10' : 'border-border bg-surface-elevated'
    }`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          completed ? 'bg-sage-soft text-sage' : pendingPast ? 'bg-amber-500/10 text-amber-600' : untracked ? 'bg-surface text-text-tertiary' : 'bg-signal-soft text-signal'
        }`}>
          {completed ? <CheckCircle2 className="h-4 w-4" /> : pendingPast ? <Clock3 className="h-4 w-4" /> : untracked ? <Circle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal">{activity.activityType.replaceAll('_', ' ')}</span>
            <span className={`text-[10px] font-semibold ${completed ? 'text-sage' : pendingPast ? 'text-amber-600' : 'text-text-tertiary'}`}>{status}</span>
            {recommended && <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-bold text-white">RECOMMENDED NEXT</span>}
          </div>
          <h3 className={`text-sm font-semibold ${completed ? 'text-text-secondary' : 'text-text-primary'}`}>{activity.title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{activity.courseTitle}{activity.topicTitle ? ` · ${activity.topicTitle}` : ''}</p>
          {!compact && <p className="mt-1 text-xs leading-relaxed text-text-tertiary">{activity.rationale}</p>}
          {compact && <p className="mt-1 text-xs text-text-tertiary">{formatCalendarDate(activity.scheduledDate)} · {activity.estimatedDurationMinutes} min</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs tabular-nums text-text-tertiary">{activity.estimatedDurationMinutes} min</span>
        <Link to={activity.actionUrl} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-signal hover:text-signal">
          {completed ? 'Review' : 'Start'} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

const SectionHeading: React.FC<{ title: string; detail?: string; count?: number }> = ({ title, detail, count }) => (
  <div className="flex flex-wrap items-end justify-between gap-2">
    <div><h3 className="text-sm font-bold text-text-primary">{title}</h3>{detail && <p className="mt-1 text-xs text-text-secondary">{detail}</p>}</div>
    {count !== undefined && <span className="text-xs font-medium tabular-nums text-text-tertiary">{count}</span>}
  </div>
);

export const StudyPlannerPage: React.FC = () => {
  const { plan, preferences, quota,  proposedRevision, isLoading, error, refetch, updatePreferences, generatePlan, proposeRevision, acceptRevision } = useStudyPlan();
  const [tab, setTab] = useState<Tab>('WEEK');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailyTime, setDailyTime] = useState('1-2 hours');
  const [sessionDuration, setSessionDuration] = useState(45);
  const [learningPriority, setLearningPriority] = useState<StudyPreferences['learningPriority']>('BALANCED_PROGRESS');

  useEffect(() => {
    if (!preferences) return;
    setDailyTime(preferences.dailyStudyTime || '1-2 hours');
    setSessionDuration(preferences.preferredSessionDuration || 45);
    setLearningPriority(preferences.learningPriority || 'BALANCED_PROGRESS');
  }, [preferences]);

  const todayActivities = plan?.todayActivities ?? [];
  const overdueActivities = (plan?.scheduledActivities ?? []).filter((activity) =>
    isTrackableActivity(activity) && !activity.isCompleted && activity.temporalStatus === 'PAST'
  );
  const completedTodayActivities = todayActivities.filter((activity) =>
    isTrackableActivity(activity) && activity.isCompleted
  );
  const actionableTodayActivities = todayActivities.filter((activity) =>
    !isTrackableActivity(activity) || !activity.isCompleted
  );
  const recommendedActivity = plan?.nextActivity ?? null;
  const days = useMemo(() => plan?.weekDays?.length === 7 ? plan.weekDays : DAY_NAMES.map((day) => ({
    dayOfWeek: day as typeof DAY_NAMES[number],
    date: '',
    dayState: 'UPCOMING' as const,
    isToday: false,
    activities: (plan?.scheduledActivities ?? []).filter((a) => a.dayOfWeek === day),
    activityCount: (plan?.scheduledActivities ?? []).filter((a) => a.dayOfWeek === day).length,
    completedCount: (plan?.scheduledActivities ?? []).filter((a) => a.dayOfWeek === day && a.isCompleted).length,
    pendingCount: (plan?.scheduledActivities ?? []).filter((a) => a.dayOfWeek === day && !a.isCompleted).length,
    totalDurationMinutes: (plan?.scheduledActivities ?? []).filter((a) => a.dayOfWeek === day).reduce((n, a) => n + a.estimatedDurationMinutes, 0),
    isRestDay: !(plan?.scheduledActivities ?? []).some((a) => a.dayOfWeek === day),
  })), [plan]);

  const savePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await updatePreferences({ dailyStudyTime: dailyTime, preferredSessionDuration: sessionDuration, learningPriority });
      const proposal = await proposeRevision('Learner updated weekly study preferences');
      setNotice(proposal.isRevisionRecommended ? 'Preferences saved. A revised schedule is ready for your review.' : 'Preferences saved. Your current schedule remains suitable.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally { setSaving(false); }
  };

  if (isLoading && !plan) return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-text-secondary"><RefreshCw className="h-5 w-5 animate-spin text-signal" /> Loading your seven-day study plan…</div>;
  if (error && !plan) return <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center"><AlertCircle className="mx-auto mb-3 h-7 w-7 text-error" /><h2 className="font-semibold text-text-primary">Unable to load your study plan</h2><p className="my-3 text-sm text-text-secondary">{error}</p><button onClick={() => void refetch()} className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;

  if (!plan) return (
    <div className="mx-auto max-w-3xl space-y-5 py-12 text-center">
      <Sparkles className="mx-auto h-9 w-9 text-signal" />
      <h1 className="font-display text-2xl font-bold text-text-primary">Create your study plan</h1>
      <p className="text-sm text-text-secondary">Your study plan is generated only when you choose to create it. Opening this page does not use a generation opportunity.</p>
      <button type="button" onClick={() => void generatePlan('Learner requested initial study plan')} disabled={isLoading || quota?.canGenerate === false} className="rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isLoading ? 'Generating…' : 'Generate my seven-day plan'}</button>
      {quota?.reason && <p className="text-xs text-text-tertiary">{quota.reason}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal"><Sparkles className="h-4 w-4" /> Personalized learning plan</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Your weekly study plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">A practical view of what needs attention, what is scheduled next, and progress backed by recorded learning evidence.</p>
          {plan && <p className="mt-2 text-xs text-text-tertiary">{plan.startDate} – {plan.endDate} · Plan v{plan.version}</p>}
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[19rem] md:items-end">
          <div className="flex w-full flex-wrap items-center gap-2 md:justify-end">
            <button type="button" onClick={() => void generatePlan('Learner requested study plan generation')} disabled={isLoading || quota?.canGenerate === false} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-signal disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"><RefreshCw className="h-4 w-4" /> {plan ? 'Regenerate plan' : 'Generate plan'}</button>
            <button type="button" onClick={() => setTab('PREFERENCES')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-signal sm:flex-none"><Settings2 className="h-4 w-4" /> Preferences</button>
          </div>
          <div className="w-full text-left text-xs leading-relaxed text-text-secondary md:text-right">
            <p>{quota?.reason || 'Generate a seven-day plan when you are ready.'}</p>
            {quota?.regenerationDeadline && quota.regenerationAvailable && <p className="mt-0.5 text-[10px] text-text-tertiary">Regeneration closes {new Date(quota.regenerationDeadline).toLocaleString()}</p>}
          </div>
        </div>
      </header>

      {proposedRevision && <section className="flex flex-col justify-between gap-3 rounded-xl border border-signal/30 bg-signal-soft/20 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-text-primary">A schedule revision is available</p><p className="mt-1 text-xs text-text-secondary">{proposedRevision.reason} · {proposedRevision.proposedActivities.length} activities</p></div><button type="button" onClick={() => void acceptRevision()} className="rounded-lg bg-signal px-4 py-2 text-xs font-bold text-white">Apply revised plan</button></section>}

      {plan && <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          ['Scheduled', plan.summary.totalScheduled],
          ['Trackable', plan.summary.trackableActivityCount ?? (plan.summary.completedCount + plan.summary.pendingCount)],
          ['Completed', plan.summary.completedCount],
          ['Trackable pending', plan.summary.pendingCount],
          ['Evidence progress', `${plan.summary.progressPercentage}%`],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{value}</p></div>)}
      </section>}

      <nav className="-mx-1 flex gap-2 overflow-x-auto border-b border-border px-1 pb-3" aria-label="Study planner sections">
        {([['WEEK','7-day schedule'],['TODAY',"Today's focus"],['REVIEW','Weekly review'],['PREFERENCES','Preferences']] as [Tab,string][]).map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-signal text-white' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}>{label}</button>)}
      </nav>

      {tab === 'WEEK' && <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-text-primary">Your seven-day schedule</h2><span className="text-xs text-text-tertiary">Calendar dates follow your plan</span></div>
        {days.map((day) => <article key={day.date || day.dayOfWeek} className={`rounded-2xl border bg-surface ${day.isToday ? 'border-signal ring-1 ring-signal/20' : 'border-border'}`}>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-text-primary">{day.dayOfWeek[0] + day.dayOfWeek.slice(1).toLowerCase()}</h3>{day.isToday && <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-bold text-white">TODAY</span>}<span className="text-xs text-text-tertiary">{day.date}</span></div>
            <span className="text-xs text-text-secondary">{day.activityCount} activities · {day.totalDurationMinutes} min</span>
          </header>
          <div className="space-y-2 p-3 sm:p-4">
            {day.activities.length ? day.activities.map((activity) => <ActivityCard key={activity.activityId} activity={activity} />) : <div className="rounded-xl bg-surface-elevated px-4 py-4 text-center"><p className="text-xs font-semibold text-text-secondary">Rest / flexible learning day</p><p className="mt-1 text-xs text-text-tertiary">No eligible unique activity was available for this day. No activity has been duplicated to fill the schedule.</p></div>}
          </div>
        </article>)}
      </section>}

      {tab === 'TODAY' && <section className="max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-signal">Today's learning space</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><h2 className="font-display text-xl font-semibold text-text-primary">{formatCalendarDate(plan.todayDate)}</h2>
              <p className="mt-1 text-sm text-text-secondary">Start with anything overdue, continue today's schedule, then use the recommended next activity.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[270px]">
              <div className="rounded-xl bg-surface-elevated p-3 text-center"><p className="text-lg font-bold tabular-nums text-text-primary">{overdueActivities.length}</p><p className="text-[10px] text-text-tertiary">Overdue</p></div>
              <div className="rounded-xl bg-surface-elevated p-3 text-center"><p className="text-lg font-bold tabular-nums text-text-primary">{todayActivities.length}</p><p className="text-[10px] text-text-tertiary">Today</p></div>
              <div className="rounded-xl bg-surface-elevated p-3 text-center"><p className="text-lg font-bold tabular-nums text-sage">{completedTodayActivities.length}</p><p className="text-[10px] text-text-tertiary">Evidence done</p></div>
            </div>
          </div>
        </div>

        {recommendedActivity && <section className="space-y-3">
          <SectionHeading title="Recommended next activity" detail="Suggested from your active plan; it does not change your schedule." />
          <ActivityCard activity={recommendedActivity} recommended />
        </section>}

        <section className="space-y-3">
          <SectionHeading title="Needs attention" detail="Trackable activities from previous plan days without completion evidence." count={overdueActivities.length} />
          {overdueActivities.length ? overdueActivities.map((activity) => <ActivityCard key={activity.activityId} activity={activity} compact />) :
            <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">No overdue trackable activities. You're up to date with the recorded requirements from earlier days.</div>}
        </section>

        <section className="space-y-3">
          <SectionHeading title="Scheduled for today" detail="Lessons are self-paced; their completion is not inferred or counted as evidence." count={actionableTodayActivities.length} />
          {actionableTodayActivities.length ? actionableTodayActivities.map((activity) => <ActivityCard key={activity.activityId} activity={activity} />) :
            <div className="rounded-xl border border-border bg-surface p-5 text-sm text-text-secondary">Nothing is scheduled for today. You can use this time for flexible learning or follow the recommended activity above.</div>}
        </section>

        <section className="space-y-3">
          <SectionHeading title="Completed today" detail="Only completion supported by the platform's recorded evidence is shown here." count={completedTodayActivities.length} />
          {completedTodayActivities.length ? completedTodayActivities.map((activity) => <ActivityCard key={activity.activityId} activity={activity} compact />) :
            <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">No completed trackable activities have been recorded for today yet.</div>}
        </section>
      </section>}

      {tab === 'REVIEW' && <WeeklyLearningReview planId={plan._id} />}

      {tab === 'PREFERENCES' && <form onSubmit={savePreferences} className="max-w-3xl space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div><h2 className="font-semibold text-text-primary">Schedule preferences</h2><p className="mt-1 text-xs text-text-secondary">Choose a realistic daily workload and session length. Saving preferences may prepare a proposed schedule revision for your approval.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-text-primary">Daily capacity<select value={dailyTime} onChange={(e) => setDailyTime(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"><option>Less than 1 hour</option><option>1-2 hours</option><option>2-3 hours</option><option>3-4 hours</option><option>5 or more hours</option></select></label>
          <label className="text-xs font-semibold text-text-primary">Preferred session<select value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">{[15,30,45,60,90,120].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></label>
          <label className="text-xs font-semibold text-text-primary md:col-span-2">Learning priority<select value={learningPriority} onChange={(e) => setLearningPriority(e.target.value as StudyPreferences['learningPriority'])} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"><option value="BALANCED_PROGRESS">Balanced progress</option><option value="IMPROVE_WEAK_TOPICS">Improve weak topics</option><option value="ASSESSMENT_PREPARATION">Assessment preparation</option><option value="CONTINUE_LEARNING">Continue learning</option></select></label>
        </div>
        {notice && <p className="text-xs text-text-secondary">{notice}</p>}
        <button disabled={saving} className="rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button>
      </form>}
    </div>
  );
};
