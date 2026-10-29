import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import type { PracticeQuestionSnapshot } from '../../types/practiceAttempt.types';

interface PracticeProgressHeaderProps {
  practiceId: string;
  attemptNumber: number;
  isSubmitted: boolean;
  contributeToLearningEvidence: boolean;
  questions: PracticeQuestionSnapshot[];
  currentIndex: number;
  answeredCount: number;
  totalQuestions: number;
  onSelectIndex: (index: number) => void;
  onOpenSubmitModal: () => void;
  isSavingAnswer: boolean;
}

export const PracticeProgressHeader: React.FC<PracticeProgressHeaderProps> = ({
  practiceId,
  attemptNumber,
  isSubmitted,
  contributeToLearningEvidence,
  questions,
  currentIndex,
  answeredCount,
  totalQuestions,
  onSelectIndex,
  onOpenSubmitModal,
  isSavingAnswer,
}) => {
  const percentageAnswered =
    totalQuestions === 0 ? 0 : Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 md:p-6 shadow-sm space-y-5">
      {/* Top row: breadcrumb & submit action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/learner/practices/${practiceId}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors"
            aria-label="Back to practice overview"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm md:text-base font-semibold text-text-primary">
                Practice Session
              </span>
              <span className="rounded-full bg-signal-soft/60 px-2 py-0.5 text-[11px] font-bold text-signal">
                Attempt #{attemptNumber}
              </span>
              {isSubmitted ? (
                <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-bold text-sage">
                  Completed
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  In Progress
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {contributeToLearningEvidence ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-signal">
                  <Sparkles className="h-3 w-3" /> Contributes to Evidence
                </span>
              ) : (
                <span className="text-[11px] text-text-tertiary">
                  Formative practice (not recorded to evidence)
                </span>
              )}
            </div>
          </div>
        </div>

        {!isSubmitted && (
          <Button
            type="button"
            variant="primary"
            onClick={onOpenSubmitModal}
            disabled={isSavingAnswer}
            className="cursor-pointer bg-sage hover:bg-sage/90 text-white font-semibold text-xs px-4 py-2"
          >
            Submit Practice
          </Button>
        )}
      </div>

      {/* Progress tracker & counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            <strong className="text-text-primary">{answeredCount}</strong> of {totalQuestions} answered
          </span>
          <span className="font-semibold text-text-primary">{percentageAnswered}% complete</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-disabled">
          <div
            className="h-full bg-signal transition-all duration-300 ease-out"
            style={{ width: `${percentageAnswered}%` }}
          />
        </div>
      </div>

      {/* Question Number Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered =
            q.isAnswered ??
            (q.answer !== undefined &&
              q.answer !== null &&
              (Array.isArray(q.answer) ? q.answer.length > 0 : Boolean(q.answer)));
          const isCorrect = q.isCorrect;

          let pillStyles = 'border-border bg-surface-elevated text-text-secondary hover:border-text-tertiary';

          if (isSubmitted) {
            if (isCorrect === true) {
              pillStyles = 'border-sage/40 bg-sage-soft text-sage font-bold';
            } else if (isAnswered) {
              pillStyles = 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold';
            } else {
              pillStyles = 'border-border bg-surface-disabled text-text-tertiary';
            }
          } else {
            if (isAnswered) {
              pillStyles = 'border-signal/30 bg-signal-soft text-signal font-semibold';
            }
          }

          if (isCurrent) {
            pillStyles += ' ring-2 ring-signal ring-offset-2 ring-offset-surface';
          }

          return (
            <button
              key={q.questionId}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-all cursor-pointer ${pillStyles}`}
              aria-label={`Jump to question ${idx + 1}`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
