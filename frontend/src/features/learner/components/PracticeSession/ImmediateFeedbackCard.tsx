import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, Info, Sparkles } from 'lucide-react';
import type { PracticeQuestionSnapshot } from '../../types/practiceAttempt.types';

interface ImmediateFeedbackCardProps {
  question: PracticeQuestionSnapshot;
  isSubmitted: boolean;
}

export const ImmediateFeedbackCard: React.FC<ImmediateFeedbackCardProps> = ({
  question,
  isSubmitted,
}) => {
  // Only render if backend authorized and returned feedback fields
  if (question.isCorrect === undefined && !question.correctAnswer) {
    return null;
  }

  const isAnswered =
    question.isAnswered ??
    (question.answer !== undefined &&
      question.answer !== null &&
      (Array.isArray(question.answer) ? question.answer.length > 0 : Boolean(question.answer)));

  const isCorrect = Boolean(question.isCorrect);

  // Resolve correct answer text from question options if available
  const getCorrectAnswerDisplay = () => {
    if (!question.correctAnswer) return null;

    if (question.type === 'TRUE_FALSE') {
      return question.correctAnswer === 'TRUE' ? 'True' : 'False';
    }

    if (Array.isArray(question.correctAnswer)) {
      const keys = question.correctAnswer;
      const texts = keys.map((key) => {
        const option = question.options?.find((o) => o.key === key);
        return option ? `${key}. ${option.text}` : key;
      });
      return texts.join(' and ');
    }

    const key = question.correctAnswer;
    const option = question.options?.find((o) => o.key === key);
    return option ? `${key}. ${option.text}` : key;
  };

  const getCardStyles = () => {
    if (!isAnswered) {
      return 'border-border/60 bg-surface-elevated/70 dark:bg-surface-elevated/40';
    }
    if (isCorrect) {
      return 'border-sage/30 bg-sage-soft/40 dark:bg-sage-soft/20';
    }
    return 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/10';
  };

  const getIconContainerStyles = () => {
    if (!isAnswered) {
      return 'bg-surface-disabled text-text-tertiary border border-border';
    }
    if (isCorrect) {
      return 'bg-sage-soft text-sage border border-sage/30';
    }
    return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
  };

  return (
    <div
      role="region"
      aria-label="Question Feedback"
      className={`rounded-2xl border p-5 space-y-3.5 transition-all duration-300 animate-in fade-in slide-in-from-top-2 duration-300 ${getCardStyles()}`}
    >
      {/* Status banner */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${getIconContainerStyles()}`}
        >
          {!isAnswered ? (
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          ) : isCorrect ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-bold ${
                !isAnswered
                  ? 'text-text-secondary'
                  : isCorrect
                  ? 'text-sage'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {!isAnswered ? 'Not Answered' : isCorrect ? 'Correct Answer' : 'Incorrect'}
            </h4>
            <span className="text-xs text-text-tertiary">
              ({!isAnswered ? `0 / ${question.marks}` : isCorrect ? `+${question.marks}` : `0 / ${question.marks}`}{' '}
              {question.marks === 1 ? 'mark' : 'marks'})
            </span>
          </div>

          {!isAnswered && (
            <p className="text-xs text-text-tertiary mt-0.5">
              You did not provide an answer for this question.
            </p>
          )}

          {!isCorrect && (
            <p className="text-xs text-text-secondary mt-1">
              <span className="font-semibold text-text-primary">Correct answer: </span>
              {getCorrectAnswerDisplay()}
            </p>
          )}
        </div>
      </div>

      {/* Explanation text */}
      {question.explanation && (
        <div className="rounded-xl border border-border/40 bg-surface/80 p-3.5 text-xs text-text-secondary space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-text-primary text-[11px] uppercase tracking-wider">
            <Info className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
            Explanation
          </div>
          <p className="leading-relaxed whitespace-pre-line">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Formative learning note when attempt is still in progress */}
      {!isSubmitted && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary pt-1">
          <Sparkles className="h-3 w-3 text-signal shrink-0" aria-hidden="true" />
          <span>
            Formative practice: You can change and re-save your answer before finalizing submission.
          </span>
        </div>
      )}
    </div>
  );
};
