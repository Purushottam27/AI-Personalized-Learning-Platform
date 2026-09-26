import React from 'react';
import { Flame, Clock, CheckCircle2 } from 'lucide-react';
import type { LearningSummaryData } from '../types/learner.types';

interface LearningSummaryProps {
  summary: LearningSummaryData | null;
}

export const LearningSummary: React.FC<LearningSummaryProps> = ({ summary }) => {
  if (!summary) {
    return null;
  }

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-tertiary mb-5">This Week</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-surface-elevated border border-border-muted">
          <Clock className="w-5 h-5 text-text-secondary mb-2" />
          <span className="text-xl font-semibold text-text-primary">{formatHours(summary.weeklyStudyMinutes)}</span>
          <span className="text-xs text-text-tertiary mt-1">Study time</span>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-surface-elevated border border-border-muted">
          <CheckCircle2 className="w-5 h-5 text-sage mb-2" />
          <span className="text-xl font-semibold text-text-primary">{summary.topicsCompletedThisWeek}</span>
          <span className="text-xs text-text-tertiary mt-1">Topics done</span>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-surface-elevated border border-border-muted">
          <Flame className="w-5 h-5 text-signal mb-2" />
          <span className="text-xl font-semibold text-text-primary">{summary.currentStreakDays}</span>
          <span className="text-xs text-text-tertiary mt-1">Day streak</span>
        </div>
      </div>
    </div>
  );
};
