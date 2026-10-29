import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckSquare,
  HelpCircle,
  Loader2,
  RotateCcw,
  Save,
  Square,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import type { PracticeQuestionSnapshot } from '../../types/practiceAttempt.types';
import { ImmediateFeedbackCard } from './ImmediateFeedbackCard';

interface PracticeQuestionCardProps {
  question: PracticeQuestionSnapshot;
  questionNumber: number;
  totalQuestions: number;
  isSaving: boolean;
  isSubmitted: boolean;
  onSaveAnswer: (
    questionId: string,
    answer: string | string[] | null,
  ) => Promise<boolean>;
  onPrev: () => void;
  onNext: () => void;
  onOpenSubmitModal: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const PracticeQuestionCard: React.FC<PracticeQuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  isSaving,
  isSubmitted,
  onSaveAnswer,
  onPrev,
  onNext,
  onOpenSubmitModal,
  hasPrev,
  hasNext,
}) => {
  // Local state for current selection before/while saving
  const [prevSavedAnswer, setPrevSavedAnswer] = useState<string | string[] | null>(
    question.answer ?? null,
  );
  const [localAnswer, setLocalAnswer] = useState<string | string[] | null>(
    question.answer ?? null,
  );

  // Sync local answer when question.answer prop updates (e.g. after save)
  if (question.answer !== prevSavedAnswer) {
    setPrevSavedAnswer(question.answer ?? null);
    setLocalAnswer(question.answer ?? null);
  }

  const isAnswerDirty = (() => {
    const saved = question.answer;
    if (saved === undefined || saved === null) {
      return localAnswer !== null && (Array.isArray(localAnswer) ? localAnswer.length > 0 : true);
    }
    if (Array.isArray(saved) && Array.isArray(localAnswer)) {
      if (saved.length !== localAnswer.length) return true;
      const sortedSaved = [...saved].sort().join(',');
      const sortedLocal = [...localAnswer].sort().join(',');
      return sortedSaved !== sortedLocal;
    }
    return saved !== localAnswer;
  })();

  const isAnsweredOnServer =
    question.answer !== undefined &&
    question.answer !== null &&
    (Array.isArray(question.answer) ? question.answer.length > 0 : true);

  const hasSelection =
    localAnswer !== null &&
    (Array.isArray(localAnswer) ? localAnswer.length > 0 : Boolean(localAnswer));

  const handleClearSelection = () => {
    if (isSubmitted || isSaving) return;
    setLocalAnswer(null);
  };

  const handleSingleSelect = (key: string) => {
    if (isSubmitted) return;
    setLocalAnswer(key);
  };

  const handleMultiToggle = (key: string) => {
    if (isSubmitted) return;
    setLocalAnswer((prev) => {
      const current = Array.isArray(prev) ? [...prev] : [];
      if (current.includes(key)) {
        return current.filter((k) => k !== key);
      }
      return [...current, key].sort();
    });
  };

  const handleTrueFalseSelect = (val: 'TRUE' | 'FALSE') => {
    if (isSubmitted) return;
    setLocalAnswer(val);
  };

  const handleSaveClick = async () => {
    if (isSaving || isSubmitted) return;
    const answerToSave =
      Array.isArray(localAnswer) && localAnswer.length === 0 ? null : localAnswer;
    await onSaveAnswer(question.questionId, answerToSave);
  };

  const renderDifficulty = () => {
    switch (question.difficulty) {
      case 'EASY':
        return (
          <span className="inline-flex items-center rounded-md bg-sage-soft px-2 py-0.5 text-xs font-semibold text-sage">
            Easy
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            Medium
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center rounded-md bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">
            Hard
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-xl p-6 md:p-8 space-y-6 transition-all duration-300">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-text-primary">
            Question {questionNumber}
          </span>
          <span className="text-xs text-text-tertiary">of {totalQuestions}</span>
        </div>

        <div className="flex items-center gap-2">
          {renderDifficulty()}
          <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-secondary">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </span>
          {isAnsweredOnServer && !isAnswerDirty && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sage-soft px-2 py-0.5 text-xs font-semibold text-sage">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Question Prompt */}
      <div className="space-y-1">
        {question.type === 'MCQ_MULTIPLE' && (
          <p className="text-xs font-semibold text-signal uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" /> Multiple Choice — Select all that apply
          </p>
        )}
        <h3 className="font-serif text-lg md:text-xl font-semibold text-text-primary leading-relaxed whitespace-pre-line">
          {question.questionText}
        </h3>
      </div>

      {/* Options Rendering */}
      <div className="space-y-3 pt-2">
        {question.type === 'MCQ_SINGLE' && (
          <div className="space-y-2.5">
            {question.options.map((option) => {
              const isSelected = localAnswer === option.key;
              return (
                <div
                  key={option.key}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSubmitted ? -1 : 0}
                  onClick={() => handleSingleSelect(option.key)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleSingleSelect(option.key);
                    }
                  }}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 ${
                    isSubmitted ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-signal bg-signal-soft/40 shadow-sm'
                      : 'border-border bg-surface-elevated/40 hover:border-text-tertiary hover:bg-surface-elevated'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-signal text-white'
                        : 'border border-border text-text-tertiary bg-surface'
                    }`}
                  >
                    {option.key}
                  </div>
                  <div className="flex-1 text-sm text-text-primary leading-relaxed pt-0.5">
                    {option.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {question.type === 'MCQ_MULTIPLE' && (
          <div className="space-y-2.5">
            {question.options.map((option) => {
              const isSelected =
                Array.isArray(localAnswer) && localAnswer.includes(option.key);
              return (
                <div
                  key={option.key}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={isSubmitted ? -1 : 0}
                  onClick={() => handleMultiToggle(option.key)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleMultiToggle(option.key);
                    }
                  }}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 ${
                    isSubmitted ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-signal bg-signal-soft/40 shadow-sm'
                      : 'border-border bg-surface-elevated/40 hover:border-text-tertiary hover:bg-surface-elevated'
                  }`}
                >
                  <div className="pt-0.5 text-signal shrink-0">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5 text-text-tertiary" />
                    )}
                  </div>
                  <div className="flex-1 text-sm text-text-primary leading-relaxed">
                    <span className="font-bold text-text-secondary mr-2">
                      {option.key}.
                    </span>
                    {option.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {question.type === 'TRUE_FALSE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(['TRUE', 'FALSE'] as const).map((val) => {
              const isSelected = localAnswer === val;
              return (
                <button
                  key={val}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleTrueFalseSelect(val)}
                  className={`flex items-center justify-center p-5 rounded-2xl border font-serif text-base font-semibold transition-all duration-200 ${
                    isSubmitted ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-signal bg-signal text-white shadow-md'
                      : 'border-border bg-surface-elevated text-text-primary hover:border-text-tertiary'
                  }`}
                >
                  {val === 'TRUE' ? 'True' : 'False'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save / Check Answer Action Bar (While In-Progress) */}
      {!isSubmitted && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          <p className="text-xs text-text-tertiary">
            {isAnswerDirty ? (
              <span className="text-signal font-medium">
                {localAnswer === null && isAnsweredOnServer
                  ? 'Selection cleared — unsaved'
                  : 'Unsaved selection'}
              </span>
            ) : isAnsweredOnServer ? (
              'Answer saved'
            ) : (
              'Select an option and save your answer'
            )}
          </p>

          <div className="flex items-center gap-2">
            {hasSelection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={isSaving}
                className="cursor-pointer text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                aria-label="Clear selected answer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Selection
              </Button>
            )}

            <Button
              type="button"
              variant={isAnswerDirty ? 'primary' : 'secondary'}
              onClick={handleSaveClick}
              disabled={isSaving || !isAnswerDirty}
              className="cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isAnsweredOnServer && isAnswerDirty ? 'Update Answer' : 'Save Answer'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Review Feedback (Revealed after submission) */}
      {isSubmitted && (
        <ImmediateFeedbackCard
          question={question}
          isSubmitted={isSubmitted}
        />
      )}

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={onPrev}
          disabled={!hasPrev || isSaving}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>

        <div className="flex items-center gap-2">
          {hasNext ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onNext}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : !isSubmitted ? (
            <Button
              type="button"
              variant="primary"
              onClick={onOpenSubmitModal}
              disabled={isSaving}
              className="cursor-pointer bg-sage hover:bg-sage/90 text-white font-semibold"
            >
              Finish & Submit Practice
            </Button>
          ) : (
            <span className="text-xs text-text-tertiary">End of practice review</span>
          )}
        </div>
      </div>
    </div>
  );
};
