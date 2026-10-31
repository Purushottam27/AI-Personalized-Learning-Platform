import React from 'react';
import { useLearnerDashboard } from '../hooks/useLearnerDashboard';
import { WelcomeHeader } from '../components/WelcomeHeader';
import { ContinueLearningCard } from '../components/ContinueLearningCard';
import { NextBestAction } from '../components/NextBestAction';
import { StrengthsWeaknesses } from '../components/StrengthsWeaknesses';
import { LearningSummary } from '../components/LearningSummary';
import { StudyPlannerWidget } from '../components/StudyPlannerWidget';
import { RecommendedCourses } from '../components/RecommendedCourses';
import { RecentActivity } from '../components/RecentActivity';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const LearnerDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useLearnerDashboard();

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-4" />
        <p className="text-sm text-text-secondary font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-error-soft flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load dashboard</h2>
        <p className="text-text-secondary mb-6 text-center max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors duration-150 px-6 py-3 text-sm rounded-xl border border-border hover:bg-surface-elevated text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full min-w-0 space-y-10 pb-14 sm:space-y-12">
        <WelcomeHeader />
        <section aria-labelledby="continue-learning-heading" className="space-y-5">
          <div className="border-b border-border-muted pb-3"><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Keep your momentum</p><h2 id="continue-learning-heading" className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Continue Learning</h2></div>
          <ContinueLearningCard progress={null} />
        </section>
        <StudyPlannerWidget />
      </div>
    );
  }

  // Avoid repeating the current lesson as a separate recommendation when both
  // dashboard surfaces point to the same course/topic.
  const nextAction = data.nextBestAction;
  const isDuplicateContinueAction = Boolean(
    nextAction?.type === 'CONTINUE_LESSON' &&
    data.continueLearning?.courseId &&
    nextAction.courseId === data.continueLearning.courseId &&
    (nextAction.topicId || nextAction.targetId) === data.continueLearning.currentTopicId,
  );

  return (
    <div className="w-full min-w-0 space-y-10 pb-14 sm:space-y-12">
      <WelcomeHeader />

      {data.summary && (
        <section aria-labelledby="weekly-learning-heading" className="space-y-5">
          <div className="flex items-end justify-between gap-3 border-b border-border-muted pb-3">
            <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Your progress</p><h2 id="weekly-learning-heading" className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Your learning this week</h2></div>
            <span className="hidden text-xs font-medium text-text-tertiary sm:inline">Weekly overview</span>
          </div>
          <LearningSummary summary={data.summary} />
        </section>
      )}

      <section aria-labelledby="continue-learning-heading" className="space-y-5">
        <div className="flex items-end justify-between gap-3 border-b border-border-muted pb-3">
          <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Keep your momentum</p><h2 id="continue-learning-heading" className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Continue Learning</h2></div>
          <span className="hidden text-xs font-medium text-text-tertiary sm:inline">Pick up where you left off</span>
        </div>
        <ContinueLearningCard progress={data.continueLearning} />
      </section>

      <section aria-labelledby="study-schedule-heading" className="space-y-5">
        <div className="flex items-end justify-between gap-3 border-b border-border-muted pb-3">
          <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sage">Stay on track</p><h2 id="study-schedule-heading" className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Your study schedule</h2></div>
          <span className="hidden text-xs font-medium text-text-tertiary sm:inline">Today's plan</span>
        </div>
        <StudyPlannerWidget />
      </section>

      {nextAction && !isDuplicateContinueAction && (
        <section aria-label="Recommended next action">
          <NextBestAction action={nextAction} />
        </section>
      )}

      {(data.strengths.length > 0 || data.needsAttention.length > 0) && (
        <section aria-labelledby="learning-insights-heading" className="space-y-5">
          <div className="border-b border-border-muted pb-3"><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sage">Learn from your progress</p><h2 id="learning-insights-heading" className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Understand your learning</h2>
          </div>
          <StrengthsWeaknesses strengths={data.strengths} needsAttention={data.needsAttention} />
        </section>
      )}

      {data.recommendations.length > 0 && (
        <section aria-label="Recommended courses">
          <RecommendedCourses recommendations={data.recommendations} />
        </section>
      )}

      {data.recentActivity.length > 0 && (
        <section aria-label="Recent learning activity">
          <RecentActivity activities={data.recentActivity} />
        </section>
      )}
    </div>
  );
};
