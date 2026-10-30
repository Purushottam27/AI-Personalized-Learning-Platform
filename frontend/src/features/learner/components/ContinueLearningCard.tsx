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
        <button type="button" onClick={() => navigate('/learner/explore')} className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 px-6 py-3 text-sm rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer" style={{ boxShadow: 'var(--shadow-premium-btn)' }}>
          Explore Courses <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const resumePath = `/learner/courses/${progress.courseId}/learn${progress.currentTopicId ? `?topicId=${encodeURIComponent(progress.currentTopicId)}` : ''}`;

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-shadow duration-300" style={{ boxShadow: 'var(--shadow-premium-card)' }}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-signal/15 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none transition-opacity duration-500" style={{ opacity: 'var(--ambient-opacity, 0)' }} />
      <div className="z-10 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">Continue Learning</p>
        <h2 className="text-2xl font-semibold text-text-primary mb-1">{progress.courseTitle}</h2>
        <p className="text-text-secondary mb-4 flex items-center gap-2"><PlayCircle className="w-4 h-4 text-signal" /><span className="font-medium text-text-primary">{progress.currentTopicTitle}</span></p>
        <div className="mt-6 max-w-lg">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-semibold text-text-primary">{progress.progressPercentage}% complete</span>
            <span className="text-xs font-medium text-text-secondary">
              {progress.completedTopics} of {progress.totalTopics} topics completed
            </span>
          </div>
          <div
            className="h-2.5 w-full bg-surface-disabled rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Course progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, progress.progressPercentage))}
          >
            <div
              className="h-full bg-signal transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress.progressPercentage))}%` }}
            />
          </div>
        </div>
      </div>
      <div className="z-10 md:w-auto w-full">
        <button type="button" onClick={() => navigate(resumePath)} className="w-full md:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 px-8 py-4 text-base rounded-xl bg-signal text-paper hover:bg-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer" style={{ boxShadow: 'var(--shadow-premium-btn)' }}>
          Resume Learning <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
