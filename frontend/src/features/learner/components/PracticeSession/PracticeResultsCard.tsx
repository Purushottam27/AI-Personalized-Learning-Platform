import React from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  LayoutDashboard,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import type { PracticeAttempt } from '../../types/practiceAttempt.types';

interface PracticeResultsCardProps {
  attempt: PracticeAttempt;
  onScrollToQuestions: () => void;
}

export const PracticeResultsCard: React.FC<PracticeResultsCardProps> = ({
  attempt,
  onScrollToQuestions,
}) => {
  const scorePercent = attempt.scorePercent ?? 0;
  const marksAwarded = attempt.marksAwarded ?? 0;
  const totalMarks = attempt.totalMarks ?? 0;
  const correctCount = attempt.correctCount ?? 0;
  const totalQuestions = attempt.totalQuestions ?? 0;

  const formattedDate = attempt.submittedAt
    ? new Date(attempt.submittedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  // Performance tone
  const getBadgeTone = () => {
    if (scorePercent >= 80) return 'text-sage bg-sage-soft border-sage/30';
    if (scorePercent >= 50) return 'text-amber-600 bg-amber-500/15 border-amber-500/30';
    return 'text-signal bg-signal-soft border-signal/30';
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 md:p-10 shadow-xl space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-border/60">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-soft/60 border border-signal/20 text-signal shrink-0">
            <Award className="h-8 w-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-serif text-2xl font-bold text-text-primary">
                Practice Completed
              </span>
              <span className="rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                Attempt #{attempt.attemptNumber}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              Submitted on {formattedDate}
            </p>
          </div>
        </div>

        {/* Big percentage pill */}
        <div className={`flex flex-col items-center justify-center px-6 py-3 rounded-2xl border ${getBadgeTone()}`}>
          <span className="font-serif text-3xl md:text-4xl font-extrabold tracking-tight">
            {scorePercent}%
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
            Overall Score
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface-elevated/40 p-5 space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Marks Earned
          </p>
          <p className="font-serif text-2xl font-bold text-text-primary">
            {marksAwarded} <span className="text-sm font-normal text-text-secondary">/ {totalMarks}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated/40 p-5 space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Correct Questions
          </p>
          <p className="font-serif text-2xl font-bold text-text-primary flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-sage inline" />
            {correctCount} <span className="text-sm font-normal text-text-secondary">/ {totalQuestions}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated/40 p-5 space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Evidence Status
          </p>
          {attempt.contributeToLearningEvidence ? (
            <p className="text-xs font-semibold text-signal flex items-center justify-center gap-1 pt-1.5">
              <Sparkles className="h-4 w-4" /> Recorded to Mastery
            </p>
          ) : (
            <p className="text-xs text-text-tertiary pt-1.5">
              Formative Practice Only
            </p>
          )}
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/60">
        <Button
          type="button"
          variant="secondary"
          onClick={onScrollToQuestions}
          className="cursor-pointer"
        >
          <ChevronDown className="h-4 w-4" /> Review Questions & Explanations
        </Button>

        <div className="flex items-center gap-3">
          <Link to={`/learner/practices/${attempt.practiceId}`}>
            <Button type="button" variant="secondary" className="cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Practice Again
            </Button>
          </Link>

          <Link to="/learner/dashboard">
            <Button type="button" variant="primary" className="cursor-pointer">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
