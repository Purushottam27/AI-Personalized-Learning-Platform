import React, { useEffect, useState } from 'react';
import { CalendarCheck2, ArrowRight, Sparkles, CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getActiveStudyPlan } from '../api/studyPlan.api';
import type { ScheduledActivity, StudyPlan } from '../types/studyPlan.types';

export const StudyPlannerWidget: React.FC = () => {
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPlan = async () => {
      try {
        const plan = await getActiveStudyPlan();
        if (isMounted) setActivePlan(plan ?? null);
      } catch {
        if (isMounted) setHasLoadError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void fetchPlan();
    return () => { isMounted = false; };
  }, []);

  const openPlanner = () => navigate('/learner/study-planner');

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-surface-elevated animate-pulse" />
          <div className="flex-1 space-y-2"><div className="h-4 w-40 rounded bg-surface-elevated animate-pulse" /><div className="h-3 w-56 max-w-full rounded bg-surface-elevated animate-pulse" /></div>
        </div>
      </div>
    );
  }

  const todayActivities = activePlan?.scheduledActivities?.filter((activity) => activity.isToday) ?? [];
  const completedToday = todayActivities.filter((activity) => activity.isCompleted).length;
  const progress = todayActivities.length > 0 ? Math.round((completedToday / todayActivities.length) * 100) : 0;
  const previewActivities = todayActivities.slice(0, 3);

  const renderActivityStatus = (activity: ScheduledActivity) => activity.isCompleted
    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" aria-label="Completed" />
    : <Circle className="h-4 w-4 shrink-0 text-text-tertiary" aria-label="Not completed" />;

  return (
    <div className="rounded-2xl border border-sage/20 bg-linear-to-br from-surface-elevated to-surface p-5 shadow-sm transition-all duration-200 hover:border-sage/35 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sage/20 bg-sage-soft text-sage">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold tracking-tight text-text-primary sm:text-xl">Your study schedule</h3>
              {activePlan && <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] font-semibold text-text-secondary"><Sparkles className="h-3 w-3 text-signal" /> Today's plan</span>}
            </div>
            <p className="text-sm text-text-secondary">
              {hasLoadError
                ? 'Your study schedule could not be loaded right now.'
                : activePlan
                  ? todayActivities.length > 0
                    ? `${completedToday} of ${todayActivities.length} activities completed today.`
                    : 'No activities are scheduled for today.'
                  : 'You do not have an active study plan yet.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={openPlanner} className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm font-semibold text-text-primary transition-all hover:-translate-y-0.5 hover:border-sage/40 hover:bg-sage-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-auto">
          {hasLoadError ? 'Open Study Planner' : activePlan ? 'Open Study Planner' : 'Set Up Study Plan'}
          <ArrowRight className="h-4 w-4 text-signal" />
        </button>
      </div>

      {activePlan && todayActivities.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-text-primary">{completedToday} of {todayActivities.length} activities completed</span>
            <span className="text-xs font-medium tabular-nums text-text-secondary">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-border bg-border/80 shadow-inner" role="progressbar" aria-label="Today's study plan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-sage shadow-[0_0_10px_rgba(113,137,109,0.35)] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ul className="mt-4 divide-y divide-border">
            {previewActivities.map((activity) => (
              <li key={activity.activityId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {renderActivityStatus(activity)}
                <span className={`min-w-0 flex-1 truncate text-sm ${activity.isCompleted ? 'text-text-tertiary line-through' : 'font-medium text-text-primary'}`}>{activity.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-tertiary"><Clock3 className="h-3 w-3" />{activity.estimatedDurationMinutes} min</span>
              </li>
            ))}
          </ul>
          {todayActivities.length > previewActivities.length && (
            <p className="mt-3 text-xs text-text-tertiary">+{todayActivities.length - previewActivities.length} more {todayActivities.length - previewActivities.length === 1 ? 'activity' : 'activities'} in your schedule</p>
          )}
          {completedToday === todayActivities.length && (
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-sage"><CheckCircle2 className="h-4 w-4" /> All scheduled activities completed for today</p>
          )}
        </div>
      )}

      {!activePlan && !hasLoadError && (
        <div className="mt-4 rounded-xl bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          Create a study plan to organize learning activities around your enrolled courses and preferred study days.
        </div>
      )}
    </div>
  );
};
