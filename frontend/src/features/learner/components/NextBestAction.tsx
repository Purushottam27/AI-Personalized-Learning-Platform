import React, { useState } from 'react';
import { ArrowRight, Brain, Target, BookOpen, FileText, Loader2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NextBestAction as NextBestActionType } from '../types/learner.types';
import { getLearnerPracticeById, getLearnerPracticesByTopic } from '../api/practiceAttempt.api';

interface NextBestActionProps { action: NextBestActionType | null; }

export const NextBestAction: React.FC<NextBestActionProps> = ({ action }) => {
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(false);
  if (!action) return null;

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
    if (action.isActionable === false) return;

    if (action.type === 'EXPLORE_COURSE') {
      if (action.courseId && /^[0-9a-fA-F]{24}$/.test(action.courseId)) navigate(`/learner/courses/${action.courseId}`);
      else navigate('/learner/explore');
      return;
    }

    if (action.type === 'REVIEW_TOPIC' || action.type === 'CONTINUE_LESSON') {
      const courseId = action.courseId;
      const topicId = action.topicId || (action.targetType === 'TOPIC' ? action.targetId : '');
      if (courseId && /^[0-9a-fA-F]{24}$/.test(courseId)) {
        const query = topicId && /^[0-9a-fA-F]{24}$/.test(topicId) ? `?topicId=${encodeURIComponent(topicId)}` : '';
        navigate(`/learner/courses/${courseId}/learn${query}`);
      }
      return;
    }

    if (action.type === 'TAKE_ASSESSMENT') {
      const topicId = action.topicId || action.targetId;
      if (topicId && /^[0-9a-fA-F]{24}$/.test(topicId)) navigate(`/learner/assessments/${topicId}`);
      return;
    }

    if (action.type !== 'START_PRACTICE' || !action.targetId || !/^[0-9a-fA-F]{24}$/.test(action.targetId)) return;

    setIsResolving(true);
    try {
      if (action.targetType === 'PRACTICE') {
        navigate(`/learner/practices/${action.targetId}`);
        return;
      }
      if (action.targetType === 'TOPIC') {
        const topicPractices = await getLearnerPracticesByTopic(action.targetId);
        if (topicPractices?.length) navigate(`/learner/practices/${topicPractices[0]._id}`);
        return;
      }
      try {
        const directPractice = await getLearnerPracticeById(action.targetId);
        if (directPractice?._id) {
          navigate(`/learner/practices/${directPractice._id}`);
          return;
        }
      } catch { /* Not a practice identifier; do not route to a guessed destination. */ }
    } finally {
      setIsResolving(false);
    }
  };

  const canAct = action.isActionable !== false && (
    action.type === 'EXPLORE_COURSE' ||
    ((action.type === 'REVIEW_TOPIC' || action.type === 'CONTINUE_LESSON') && Boolean(action.courseId)) ||
    (action.type === 'TAKE_ASSESSMENT' && Boolean(action.topicId || action.targetId)) ||
    (action.type === 'START_PRACTICE' && Boolean(action.targetId))
  );

  return (
    <div className="rounded-2xl border border-signal/20 bg-signal-soft/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-signal transition-shadow duration-300" style={{ boxShadow: 'var(--shadow-premium-card)' }}>
      <div className="flex items-start sm:items-center gap-4 flex-1">
        <div className="hidden sm:flex h-10 w-10 rounded-full bg-surface items-center justify-center border border-signal/10 shrink-0">{getIcon()}</div>
        <div><div className="flex items-center gap-2 mb-1"><h3 className="text-sm font-bold uppercase tracking-wider text-signal">Next Best Action</h3></div><p className="text-base font-semibold text-text-primary">{action.title}</p><p className="text-sm text-text-secondary mt-0.5">{action.description}</p></div>
      </div>
      {canAct && <button type="button" onClick={handleActionClick} disabled={isResolving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-5 py-2.5 text-sm rounded-lg bg-surface border border-border hover:bg-surface-elevated hover:border-signal/30 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
        {isResolving ? <><Loader2 className="w-4 h-4 animate-spin text-signal" /> Loading...</> : <>{getActionLabel()} <ArrowRight className="w-4 h-4 text-signal" /></>}
      </button>}
    </div>
  );
};
