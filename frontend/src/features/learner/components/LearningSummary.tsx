import React from 'react';
import { Flame, Clock, CheckCircle2 } from 'lucide-react';
import type { LearningSummaryData } from '../types/learner.types';

interface LearningSummaryProps {
  summary: LearningSummaryData | null;
}

export const LearningSummary: React.FC<LearningSummaryProps> = ({ summary }) => {
  if (!summary) return null;

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const stats = [
    { label: 'Study time', value: formatHours(summary.weeklyStudyMinutes), icon: Clock, tone: 'text-text-secondary', tile: 'bg-surface-disabled' },
    { label: 'Topics completed', value: String(summary.topicsCompletedThisWeek), icon: CheckCircle2, tone: 'text-sage', tile: 'bg-sage-soft' },
    { label: 'Current streak', value: `${summary.currentStreakDays} ${summary.currentStreakDays === 1 ? 'day' : 'days'}`, icon: Flame, tone: 'text-signal', tile: 'bg-signal-soft' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Weekly learning statistics">
      {stats.map(({ label, value, icon: Icon, tone, tile }) => (
        <div key={label} className="group min-w-0 rounded-2xl border border-border bg-linear-to-br from-surface-elevated to-surface p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/25 hover:shadow-md sm:p-5">
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tile}`}><Icon className={`h-[18px] w-[18px] ${tone}`} aria-hidden="true" /></div>
          <p className="text-xl font-bold tracking-tight text-text-primary tabular-nums sm:text-2xl">{value}</p>
          <p className="mt-1 text-xs font-medium leading-tight text-text-secondary sm:text-sm">{label}</p>
        </div>
      ))}
    </div>
  );
};
