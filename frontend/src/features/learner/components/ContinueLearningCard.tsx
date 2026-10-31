import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CourseProgress } from '../types/learner.types';

interface ContinueLearningCardProps {
  progress: CourseProgress | null;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ progress }) => {
  const navigate = useNavigate();

  if (!progress) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 flex flex-col items-center justify-center min-h-[200px] text-center transition-shadow duration-300" style={{ boxShadow: 'var(--shadow-premium-card)' }}>
        <h2 className="text-xl font-semibold text-text-primary mb-2">No active course</h2>
        <p className="text-text-secondary mb-6 max-w-md">You haven't started a course yet. Explore available courses to begin your learning journey.</p>
        <button type="button" onClick={() => navigate('/learner/explore')} className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 px-6 py-3 text-sm rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer hover:-translate-y-0.5 active:translate-y-0" style={{ boxShadow: 'var(--shadow-premium-btn)' }}>
          Explore Courses <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const resumePath = `/learner/courses/${progress.courseId}/learn${progress.currentTopicId ? `?topicId=${encodeURIComponent(progress.currentTopicId)}` : ''}`;

  return (
    <div className="rounded-2xl border border-signal/20 bg-linear-to-br from-surface-elevated via-surface to-surface-elevated p-5 sm:p-7 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:border-signal/35" style={{ boxShadow: 'var(--shadow-premium-card)' }}>
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-signal/15 blur-[80px] -mr-20 -mt-20 pointer-events-none transition-opacity duration-500" style={{ opacity: 'var(--ambient-opacity, 0)' }} />
      <div className="z-10 flex-1">
        <p className="mb-2 inline-flex items-center rounded-full border border-sage/20 bg-sage-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sage">Continue where you left off</p>
        <h2 className="mb-2 break-words font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-3xl">{progress.courseTitle}</h2>
        <p className="text-sm text-text-secondary mb-4 flex items-center gap-2"><PlayCircle className="w-4 h-4 text-signal shrink-0" /><span className="min-w-0 truncate"><span className="text-text-tertiary">Current topic:</span> <span className="font-medium text-text-primary">{progress.currentTopicTitle || 'Continue your course'}</span></span></p>
        <div className="mt-6 max-w-2xl">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-semibold text-text-primary">{progress.progressPercentage}% complete</span>
            <span className="text-xs font-medium text-text-secondary">
              {progress.completedTopics} of {progress.totalTopics} topics completed
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full border border-border bg-border/80 shadow-inner"
            role="progressbar"
            aria-label="Course progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, progress.progressPercentage))}
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-signal to-signal-hover shadow-[0_0_10px_rgba(208,100,71,0.35)] transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress.progressPercentage))}%` }}
            />
          </div>
        </div>
      </div>
      <div className="z-10 sm:w-auto w-full">
        <button type="button" onClick={() => navigate(resumePath)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 px-8 py-4 text-base rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer hover:-translate-y-0.5 active:translate-y-0" style={{ boxShadow: 'var(--shadow-premium-btn)' }}>
          Resume Learning <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
