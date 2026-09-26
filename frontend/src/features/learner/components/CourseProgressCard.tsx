import React from 'react';
import type { CourseProgress } from '../types/learner.types';

interface CourseProgressCardProps {
  progress: CourseProgress | null;
}

export const CourseProgressCard: React.FC<CourseProgressCardProps> = ({ progress }) => {
  if (!progress) {
    return null; // Handle empty state gracefully if needed, though usually hidden if none
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-tertiary mb-5">Course Progress</h3>
      
      <div className="flex items-end justify-between mb-2">
        <div className="text-3xl font-display font-semibold text-text-primary">
          {progress.progressPercentage}%
        </div>
        <div className="text-sm text-text-secondary mb-1">
          <span className="font-semibold text-text-primary">{progress.completedTopics}</span> / {progress.totalTopics} topics
        </div>
      </div>
      
      <div className="h-3 w-full bg-surface-disabled rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-sage transition-all duration-500 ease-out" 
          style={{ width: `${progress.progressPercentage}%` }}
        ></div>
      </div>
      
      <p className="text-sm text-text-secondary">
        You're making solid progress. Keep it up!
      </p>
    </div>
  );
};
