import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, RotateCcw, X } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import type { Practice } from '../../types/practice.types';

export type PracticeConfirmAction = 'PUBLISH' | 'ARCHIVE' | 'RESTORE';

interface PracticeConfirmModalProps {
  isOpen: boolean;
  action: PracticeConfirmAction | null;
  practice: Practice | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const PracticeConfirmModal: React.FC<PracticeConfirmModalProps> = ({
  isOpen,
  action,
  practice,
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage,
}) => {
  if (!isOpen || !action || !practice) return null;

  const hasNoQuestions = practice.questionIds.length === 0;

  const modalConfig = {
    PUBLISH: {
      title: 'Publish Practice',
      description:
        'This will make the practice set available to all enrolled learners in this course. Learners will be able to start attempts and receive immediate feedback.',
      confirmText: 'Publish Practice',
      confirmVariant: 'primary' as const,
      confirmClassName: 'bg-sage hover:bg-sage/90 text-white',
      Icon: CheckCircle,
      iconColor: 'text-sage',
      iconBg: 'bg-sage-soft border-sage/20',
      canConfirm: !hasNoQuestions,
    },
    ARCHIVE: {
      title: 'Archive Practice',
      description:
        'Archiving hides this practice set from learners. Existing attempts and learning evidence will be preserved, but learners can no longer start new attempts.',
      confirmText: 'Archive Practice',
      confirmVariant: 'secondary' as const,
      confirmClassName: 'border-error/30 text-error hover:bg-error-soft hover:border-error/50',
      Icon: AlertTriangle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      canConfirm: true,
    },
    RESTORE: {
      title: 'Restore Practice',
      description:
        'Restoring will move this practice back to Draft status. You will be able to edit its questions and settings before publishing it again.',
      confirmText: 'Restore to Draft',
      confirmVariant: 'primary' as const,
      confirmClassName: 'bg-signal hover:bg-signal-hover text-white',
      Icon: RotateCcw,
      iconColor: 'text-signal',
      iconBg: 'bg-signal-soft border-signal/20',
      canConfirm: true,
    },
  }[action];

  const { title, description, confirmText, confirmVariant, confirmClassName, Icon, iconColor, iconBg, canConfirm } =
    modalConfig;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${iconBg} ${iconColor} shrink-0`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="practice-confirm-title"
                className="font-serif text-xl font-semibold text-text-primary"
              >
                {title}
              </h2>
              <p className="text-xs text-text-tertiary truncate max-w-[240px]">
                {practice.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary ${interactive}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

        {action === 'PUBLISH' && hasNoQuestions && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3 text-xs text-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Cannot publish: This practice has 0 questions assigned. Edit the
              practice to select at least 1 active question from the question
              bank.
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3 text-xs text-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="break-words">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-border-muted">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className={interactive}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={isSubmitting}
            disabled={!canConfirm || isSubmitting}
            className={`${interactive} ${confirmClassName}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
