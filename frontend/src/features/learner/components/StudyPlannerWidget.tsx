import React, { useEffect, useState } from 'react';
import { CalendarCheck2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getActiveStudyPlan } from '../api/studyPlan.api';
import type { StudyPlan } from '../types/studyPlan.types';

export const StudyPlannerWidget: React.FC = () => {
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchPlan() {
      try {
        const plan = await getActiveStudyPlan();
        if (isMounted && plan) {
          setActivePlan(plan);
        }
      } catch {
        // Silently catch widget fetch errors so dashboard loads cleanly
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  const todayActivities = activePlan?.scheduledActivities?.filter((a) => a.isToday) || [];
  const completedToday = todayActivities.filter((a) => a.isCompleted).length;
  const daysPlanned = activePlan?.preferencesSnapshot?.studyDays?.length || 5;

  return (
    <div
      className="rounded-2xl border border-border bg-surface-elevated p-6 relative overflow-hidden transition-all duration-200"
      style={{ boxShadow: 'var(--shadow-premium-card)' }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-signal-soft/30 border border-signal/20 flex items-center justify-center shrink-0 text-signal">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text-primary text-base">Weekly Study Plan</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-signal-soft/50 text-signal border border-signal/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Grounded
              </span>
            </div>
            {activePlan ? (
              <p className="text-sm text-text-secondary">
                {todayActivities.length > 0
                  ? `Today's schedule: ${completedToday} of ${todayActivities.length} activities completed.`
                  : `Active schedule for ${daysPlanned} days/week. No activities scheduled for today.`}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                You have no active study plan. Generate an AI-grounded weekly schedule tailored to your pace and enrolled courses.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activePlan && todayActivities.length > 0 && completedToday === todayActivities.length && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-success font-medium bg-success-soft/30 px-3 py-1.5 rounded-lg border border-success/20">
              <CheckCircle2 className="w-4 h-4" /> All caught up for today!
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/learner/study-planner')}
            className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 px-4 py-2.5 text-sm rounded-xl bg-surface hover:bg-surface-elevated text-text-primary border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer"
          >
            {activePlan ? 'Open Planner & Assistant' : 'Set Up Study Plan'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
