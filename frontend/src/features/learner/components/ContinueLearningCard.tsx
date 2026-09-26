import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';
import type { CourseProgress } from '../types/learner.types';

interface ContinueLearningCardProps {
  progress: CourseProgress | null;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ progress }) => {
  if (!progress) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">No active course</h2>
        <p className="text-text-secondary mb-6 max-w-md">
          You haven't started a course yet. Explore available courses to begin your learning journey.
        </p>
        <button className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-6 py-3 text-sm rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Explore Courses <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
      {/* Decorative subtle gradient for premium feel */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-signal-soft/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      
      <div className="z-10 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">Continue Learning</p>
        <h2 className="text-2xl font-semibold text-text-primary mb-1">{progress.courseTitle}</h2>
        <p className="text-text-secondary mb-4 flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-signal" /> 
          <span className="font-medium text-text-primary">{progress.currentTopicTitle}</span>
        </p>
        
        <div className="flex items-center gap-4 mt-6 max-w-md">
          <div className="flex-1 h-2 bg-surface-disabled rounded-full overflow-hidden">
            <div 
              className="h-full bg-signal transition-all duration-500 ease-out" 
              style={{ width: `${progress.progressPercentage}%` }}
            ></div>
          </div>
          <span className="text-sm font-semibold text-text-secondary">{progress.progressPercentage}% complete</span>
        </div>
      </div>

      <div className="z-10 md:w-auto w-full">
        <button className="w-full md:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-8 py-4 text-base rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Resume Learning <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
