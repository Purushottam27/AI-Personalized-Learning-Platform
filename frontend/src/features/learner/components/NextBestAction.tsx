import React from 'react';
import { ArrowRight, Brain, Target, BookOpen, FileText } from 'lucide-react';
import type { NextBestAction as NextBestActionType } from '../types/learner.types';

interface NextBestActionProps {
  action: NextBestActionType | null;
}

export const NextBestAction: React.FC<NextBestActionProps> = ({ action }) => {
  if (!action) {
    return null; // Don't show if no recommendation
  }

  const getIcon = () => {
    switch (action.type) {
      case 'START_PRACTICE': return <Target className="w-5 h-5 text-signal" />;
      case 'REVIEW_TOPIC': return <Brain className="w-5 h-5 text-signal" />;
      case 'TAKE_ASSESSMENT': return <FileText className="w-5 h-5 text-signal" />;
      default: return <BookOpen className="w-5 h-5 text-signal" />;
    }
  };

  const getActionLabel = () => {
    switch (action.type) {
      case 'START_PRACTICE': return 'Start Practice';
      case 'REVIEW_TOPIC': return 'Review Topic';
      case 'TAKE_ASSESSMENT': return 'Take Assessment';
      default: return 'Continue Lesson';
    }
  };

  return (
    <div className="rounded-2xl border border-signal/20 bg-signal-soft/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-signal">
      <div className="flex items-start sm:items-center gap-4 flex-1">
        <div className="hidden sm:flex h-10 w-10 rounded-full bg-surface items-center justify-center border border-signal/10 shrink-0">
          {getIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-signal">Next Best Action</h3>
          </div>
          <p className="text-base font-semibold text-text-primary">{action.title}</p>
          <p className="text-sm text-text-secondary mt-0.5">{action.description}</p>
        </div>
      </div>
      
      <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-5 py-2.5 text-sm rounded-lg bg-surface border border-border hover:bg-surface-elevated hover:border-signal/30 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0">
        {getActionLabel()} <ArrowRight className="w-4 h-4 text-signal" />
      </button>
    </div>
  );
};
