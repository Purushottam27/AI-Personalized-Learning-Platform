import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle,  CheckCircle2, Clock3, RefreshCw, Settings2, Sparkles,  TrendingUp, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudyPlan } from '../hooks/useStudyPlan';
import type { ScheduledActivity, StudyPreferences } from '../types/studyPlan.types';

type Tab = 'WEEK' | 'TODAY' | 'REVIEW' | 'PREFERENCES';
const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const statusLabel = (activity: ScheduledActivity) => {
  if (activity.isCompleted) return 'Completed';
  if (activity.temporalStatus === 'PAST') return 'Pending from previous day';
  if (activity.temporalStatus === 'TODAY') return 'Today';
  return 'Upcoming';
};

const ActivityCard: React.FC<{ activity: ScheduledActivity }> = ({ activity }) => {
  const completed = Boolean(activity.isCompleted);
  const pendingPast = !completed && activity.temporalStatus === 'PAST';
  return (
    <article className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-elevated p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${completed ? 'bg-sage-soft text-sage' : pendingPast ? 'bg-amber-500/10 text-amber-600' : 'bg-signal-soft text-signal'}`}>
          {completed ? <CheckCircle2 className="h-4 w-4" /> : pendingPast ? <Clock3 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal">{activity.activityType}</span>
            <span className={`text-[10px] font-semibold ${completed ? 'text-sage' : pendingPast ? 'text-amber-600' : 'text-text-tertiary'}`}>{statusLabel(activity)}</span>
          </div>
          <h3 className={`text-sm font-semibold ${completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{activity.title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{activity.courseTitle}{activity.topicTitle ? ` · ${activity.topicTitle}` : ''}</p>
          <p className="mt-1 text-xs text-text-tertiary">{activity.rationale}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs text-text-tertiary">{activity.estimatedDurationMinutes} min</span>
        <Link to={activity.actionUrl} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:border-signal hover:text-signal">
          {completed ? 'Review' : 'Start'} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

export const StudyPlannerPage: React.FC = () => {
  const { plan, preferences, quota,  proposedRevision, isLoading, error, refetch, updatePreferences, generatePlan, proposeRevision, acceptRevision } = useStudyPlan();
  const [tab, setTab] = useState<Tab>('WEEK');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailyTime, setDailyTime] = useState('1-2 hours');
  const [sessionDuration, setSessionDuration] = useState(45);
  const [timeOfDay, setTimeOfDay] = useState<StudyPreferences['preferredTimeOfDay']>('ANYTIME');
  const [studyDays, setStudyDays] = useState<string[]>(DAY_NAMES);

  useEffect(() => {
    if (!preferences) return;
    setDailyTime(preferences.dailyStudyTime || '1-2 hours');
    setSessionDuration(preferences.preferredSessionDuration || 45);
    setTimeOfDay(preferences.preferredTimeOfDay || 'ANYTIME');
    setStudyDays(preferences.studyDays?.length ? preferences.studyDays : DAY_NAMES);
  }, [preferences]);

  const todayActivities = plan?.todayActivities ?? [];
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

  const isWeekFinished = Boolean(plan?.endDate && plan.endDate <= (plan.todayDate || new Date().toISOString().slice(0, 10)));
  const topicInsights = plan?.topicInsights ?? [];

  const savePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await updatePreferences({ dailyStudyTime: dailyTime, preferredSessionDuration: sessionDuration, preferredTimeOfDay: timeOfDay, studyDays });
      const proposal = await proposeRevision('Learner updated weekly study preferences');
      setNotice(proposal.isRevisionRecommended ? 'Preferences saved. A revised schedule is ready for your review.' : 'Preferences saved. Your current schedule remains suitable.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally { setSaving(false); }
  };

  if (isLoading && !plan) return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-text-secondary"><RefreshCw className="h-5 w-5 animate-spin text-signal" /> Loading your seven-day study plan…</div>;
  if (error && !plan) return <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center"><AlertCircle className="mx-auto mb-3 h-7 w-7 text-error" /><h2 className="font-semibold text-text-primary">Unable to load your study plan</h2><p className="my-3 text-sm text-text-secondary">{error}</p><button onClick={() => void refetch()} className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal"><Sparkles className="h-4 w-4" /> Personalized learning plan</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Your weekly study plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">A consistent seven-day view of your learning activities, pending work, and weekly progress.</p>
          {plan && <p className="mt-2 text-xs text-text-tertiary">{plan.startDate} – {plan.endDate} · Plan v{plan.version}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quota && <span className="mr-1 text-right text-xs text-text-secondary">{quota.remaining}/{quota.maxAllowed} regenerations left today<span className="block text-[10px] text-text-tertiary">Resets {new Date(quota.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {quota.timeZone || 'application timezone'}</span></span>}
          <button type="button" onClick={() => void generatePlan('Learner requested weekly plan regeneration')} disabled={isLoading || quota?.remaining === 0} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-signal disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Regenerate</button>
          <button type="button" onClick={() => setTab('PREFERENCES')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-signal"><Settings2 className="h-4 w-4" /> Preferences</button>
        </div>
      </header>

      {proposedRevision && <section className="flex flex-col justify-between gap-3 rounded-xl border border-signal/30 bg-signal-soft/20 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-text-primary">A schedule revision is available</p><p className="mt-1 text-xs text-text-secondary">{proposedRevision.reason} · {proposedRevision.proposedActivities.length} activities</p></div><button type="button" onClick={() => void acceptRevision()} className="rounded-lg bg-signal px-4 py-2 text-xs font-bold text-white">Apply revised plan</button></section>}

      {plan && <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Scheduled', plan.summary.totalScheduled],
          ['Completed', plan.summary.completedCount],
          ['Pending', plan.summary.pendingCount],
          ['Progress', `${plan.summary.progressPercentage}%`],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{value}</p></div>)}
      </section>}

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Study planner sections">
        {([['WEEK','7-day schedule'],['TODAY',"Today's focus"],['REVIEW','Weekly review'],['PREFERENCES','Preferences']] as [Tab,string][]).map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-signal text-white' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}>{label}</button>)}
      </nav>

      {tab === 'WEEK' && <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-text-primary">Monday – Sunday</h2><span className="text-xs text-text-tertiary">All seven days are shown</span></div>
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

      {tab === 'TODAY' && <section className="max-w-4xl space-y-3">
        <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-bold uppercase tracking-wider text-signal">Today's focus · {plan?.todayDate}</p><h2 className="mt-1 text-lg font-semibold text-text-primary">{todayActivities.length ? `${todayActivities.length} scheduled activities` : 'No activities scheduled today'}</h2><p className="mt-1 text-sm text-text-secondary">This list is derived from the same active weekly plan shown on your dashboard.</p></div>
        {todayActivities.length ? todayActivities.map((activity) => <ActivityCard key={activity.activityId} activity={activity} />) : <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-secondary">Use today as a flexible review day, or continue with an available course activity.</div>}
        {plan?.nextActivity && <p className="text-xs text-text-tertiary">Next suggested activity: <strong className="text-text-primary">{plan.nextActivity.title}</strong></p>}
      </section>}

      {tab === 'REVIEW' && <section className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-sage" /><h2 className="font-display text-lg font-semibold text-text-primary">Weekly learning review</h2></div>
          <p className="mt-2 text-sm text-text-secondary">{isWeekFinished ? 'Your scheduled week has ended. Here is the outcome based on recorded learning evidence.' : `Your week is still in progress. This is a live snapshot through ${plan?.todayDate ?? 'today'}; the final review becomes available after ${plan?.endDate}.`}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-surface-elevated p-3"><p className="text-xs text-text-tertiary">Completed</p><p className="mt-1 text-xl font-bold text-sage">{plan?.summary.completedCount ?? 0}</p></div>
            <div className="rounded-xl bg-surface-elevated p-3"><p className="text-xs text-text-tertiary">Still pending</p><p className="mt-1 text-xl font-bold text-text-primary">{plan?.summary.pendingCount ?? 0}</p></div>
            <div className="rounded-xl bg-surface-elevated p-3"><p className="text-xs text-text-tertiary">Past-day pending</p><p className="mt-1 text-xl font-bold text-amber-600">{plan?.summary.overdueCount ?? 0}</p></div>
            <div className="rounded-xl bg-surface-elevated p-3"><p className="text-xs text-text-tertiary">Completion</p><p className="mt-1 text-xl font-bold text-text-primary">{plan?.summary.progressPercentage ?? 0}%</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-bold text-text-primary">Topic learning evidence</h3>
          <p className="mt-1 text-xs text-text-secondary">These are current mastery records, not AI-generated estimates or proof that a scheduled task alone improved mastery.</p>
          {topicInsights.length ? <div className="mt-3 divide-y divide-border">{topicInsights.map((topic: any) => <div key={topic.topicId} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-medium text-text-primary">{topic.status.replaceAll('_',' ')}</p><p className="text-xs text-text-tertiary">Evidence count: {topic.evidenceCount ?? '—'}</p></div><div className="text-right"><p className="text-sm font-semibold text-text-primary">{topic.masteryScore == null ? 'Insufficient evidence' : `${topic.masteryScore}% mastery`}</p><p className="text-xs text-text-tertiary">Confidence: {topic.confidence ?? '—'}</p></div></div>)}</div> : <p className="mt-3 text-sm text-text-secondary">No topic mastery evidence is available yet. Completing lessons alone does not create a mastery score.</p>}
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4 text-xs text-text-secondary">Study-plan completion is a consistency measure. Mastery, grades, course completion, and progression continue to depend on the platform's authoritative assessment and learning-evidence rules.</div>
      </section>}

      {tab === 'PREFERENCES' && <form onSubmit={savePreferences} className="max-w-2xl space-y-5 rounded-2xl border border-border bg-surface p-5">
        <div><h2 className="font-semibold text-text-primary">Schedule preferences</h2><p className="mt-1 text-xs text-text-secondary">Preferred days influence how activities are distributed, but the weekly plan always shows all seven days.</p></div>
        <div><label className="mb-2 block text-xs font-semibold text-text-primary">Preferred study days</label><div className="flex flex-wrap gap-2">{DAY_NAMES.map((day) => <button key={day} type="button" onClick={() => setStudyDays((prev) => prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day])} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${studyDays.includes(day) ? 'border-signal bg-signal text-white' : 'border-border text-text-secondary'}`}>{day.slice(0,3)}</button>)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-text-primary">Daily capacity<select value={dailyTime} onChange={(e) => setDailyTime(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"><option>Less than 1 hour</option><option>1-2 hours</option><option>2-3 hours</option><option>3-4 hours</option><option>5 or more hours</option></select></label>
          <label className="text-xs font-semibold text-text-primary">Preferred session<select value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">{[15,30,45,60,90,120].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></label>
          <label className="text-xs font-semibold text-text-primary sm:col-span-2">Preferred time<select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as StudyPreferences['preferredTimeOfDay'])} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"><option value="ANYTIME">Flexible / anytime</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></select></label>
        </div>
        {notice && <p className="text-xs text-text-secondary">{notice}</p>}
        <button disabled={saving} className="rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button>
      </form>}
    </div>
  );
};
