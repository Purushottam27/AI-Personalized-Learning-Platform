import React from 'react';
import { useLearnerDashboard } from '../hooks/useLearnerDashboard';
import { WelcomeHeader } from '../components/WelcomeHeader';
import { ContinueLearningCard } from '../components/ContinueLearningCard';
import { NextBestAction } from '../components/NextBestAction';
import { CourseProgressCard } from '../components/CourseProgressCard';
import { StrengthsWeaknesses } from '../components/StrengthsWeaknesses';
import { LearningSummary } from '../components/LearningSummary';
import { RecommendedCourses } from '../components/RecommendedCourses';
import { RecentActivity } from '../components/RecentActivity';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const LearnerDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useLearnerDashboard();

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-4" />
        <p className="text-sm text-text-secondary font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-error-soft flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load dashboard</h2>
        <p className="text-text-secondary mb-6 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-6 py-3 text-sm rounded-xl border border-border hover:bg-surface-elevated text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // If no data is available despite no error (e.g., brand new user)
  if (!data) {
    return (
      <div className="max-w-4xl">
        <WelcomeHeader />
        <ContinueLearningCard progress={null} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <WelcomeHeader />

      <div className="space-y-6">
        <ContinueLearningCard progress={data.continueLearning} />

        {data.nextBestAction && (
          <NextBestAction action={data.nextBestAction} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2 space-y-6">
          <StrengthsWeaknesses 
            strengths={data.strengths} 
            needsAttention={data.needsAttention} 
          />
        </div>
        <div className="space-y-6">
          <CourseProgressCard progress={data.progress} />
          <LearningSummary summary={data.summary} />
        </div>
      </div>

      {data.recommendations && data.recommendations.length > 0 && (
        <RecommendedCourses recommendations={data.recommendations} />
      )}

      {data.recentActivity && data.recentActivity.length > 0 && (
        <RecentActivity activities={data.recentActivity} />
      )}
    </div>
  );
};
