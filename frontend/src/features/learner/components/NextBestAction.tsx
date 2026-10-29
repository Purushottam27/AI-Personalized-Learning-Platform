import React, { useState } from 'react';
import { ArrowRight, Brain, Target, BookOpen, FileText, Loader2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NextBestAction as NextBestActionType } from '../types/learner.types';
import {
  getLearnerPracticeById,
  getLearnerPracticesByTopic,
} from '../api/practiceAttempt.api';

interface NextBestActionProps {
  action: NextBestActionType | null;
}

export const NextBestAction: React.FC<NextBestActionProps> = ({ action }) => {
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(false);

  if (!action) {
    return null; // Don't show if no recommendation
  }

  const getIcon = () => {
    switch (action.type) {
      case 'START_PRACTICE': return <Target className="w-5 h-5 text-signal" />;
      case 'REVIEW_TOPIC': return <Brain className="w-5 h-5 text-signal" />;
      case 'TAKE_ASSESSMENT': return <FileText className="w-5 h-5 text-signal" />;
      case 'EXPLORE_COURSE': return <Compass className="w-5 h-5 text-signal" />;
      default: return <BookOpen className="w-5 h-5 text-signal" />;
    }
  };

  const getActionLabel = () => {
    switch (action.type) {
      case 'START_PRACTICE': return 'Start Practice';
      case 'REVIEW_TOPIC': return 'Review Topic';
      case 'TAKE_ASSESSMENT': return 'Take Assessment';
      case 'EXPLORE_COURSE': return 'Explore Course';
      default: return 'Continue Lesson';
    }
  };

  const handleActionClick = async () => {
    if (!action.targetId && action.type !== 'CONTINUE_LESSON' && action.type !== 'EXPLORE_COURSE') return;

    if (action.type === 'EXPLORE_COURSE') {
      if (action.targetId) {
        navigate(`/learner/courses/${action.targetId}`);
      } else {
        navigate('/learner/courses');
      }
      return;
    }

    if (action.type === 'TAKE_ASSESSMENT') {
      navigate(`/learner/assessments/${action.targetId}`);
      return;
    }

    if (action.type === 'CONTINUE_LESSON') {
      if (action.targetId) {
        navigate(`/learner/courses/${action.targetId}/learn`);
      } else {
        navigate('/learner/courses');
      }
      return;
    }

    if (action.type === 'REVIEW_TOPIC') {
      navigate(`/learner/practices/${action.targetId}`);
      return;
    }

    if (action.type !== 'START_PRACTICE') {
      return;
    }

    setIsResolving(true);
    try {
      // 1. Check if action.targetId is already a practice ID
      try {
        const directPractice = await getLearnerPracticeById(action.targetId);
        if (directPractice && directPractice._id) {
          navigate(`/learner/practices/${directPractice._id}`);
          return;
        }
      } catch {
        // targetId might be a topic ID
      }

      // 2. If targetId represents a topic, resolve a published practice for that topic
      try {
        const topicPractices = await getLearnerPracticesByTopic(action.targetId);
        if (topicPractices && topicPractices.length > 0) {
          navigate(`/learner/practices/${topicPractices[0]._id}`);
          return;
        }
      } catch {
        // Topic lookup failed or not enrolled
      }

      // 3. Fallback: navigate with targetId so overview page displays specific status
      navigate(`/learner/practices/${action.targetId}`);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div 
      className="rounded-2xl border border-signal/20 bg-signal-soft/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-signal transition-shadow duration-300"
      style={{ boxShadow: 'var(--shadow-premium-card)' }}
    >
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
      
      <button 
        type="button"
        onClick={handleActionClick}
        disabled={isResolving}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-5 py-2.5 text-sm rounded-lg bg-surface border border-border hover:bg-surface-elevated hover:border-signal/30 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isResolving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-signal" /> Loading...
          </>
        ) : (
          <>
            {getActionLabel()} <ArrowRight className="w-4 h-4 text-signal" />
          </>
        )}
      </button>
    </div>
  );
};
