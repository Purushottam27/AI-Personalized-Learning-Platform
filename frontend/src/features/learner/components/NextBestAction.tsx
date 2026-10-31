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
      case 'START_PRACTICE': return <Target className="h-5 w-5 text-signal" />;
      case 'REVIEW_TOPIC': return <Brain className="h-5 w-5 text-signal" />;
      case 'TAKE_ASSESSMENT': return <FileText className="h-5 w-5 text-signal" />;
      case 'EXPLORE_COURSE': return <Compass className="h-5 w-5 text-signal" />;
      default: return <BookOpen className="h-5 w-5 text-signal" />;
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
        if (directPractice?._id) navigate(`/learner/practices/${directPractice._id}`);
      } catch {
        // The target is not a practice identifier; do not guess a destination.
      }
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
    <div className="relative overflow-hidden rounded-2xl border border-signal/25 bg-linear-to-br from-signal-soft/70 via-surface to-surface-elevated p-5 shadow-sm transition-all duration-200 hover:border-signal/40 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-signal/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-signal/15 bg-surface"><span aria-hidden="true">{getIcon()}</span></div>
          <div className="min-w-0">
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Next Best Action</h3>
            <p className="break-words font-display text-lg font-semibold leading-snug tracking-tight text-text-primary sm:text-xl">{action.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{action.description}</p>
          </div>
        </div>
        {canAct && (
          <button type="button" onClick={handleActionClick} disabled={isResolving} className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-signal/25 bg-surface-elevated px-5 py-3 text-sm font-semibold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-signal/50 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {isResolving ? <><Loader2 className="h-4 w-4 animate-spin text-signal" /> Loading...</> : <>{getActionLabel()} <ArrowRight className="h-4 w-4 text-signal" /></>}
          </button>
        )}
      </div>
    </div>
  );
};
