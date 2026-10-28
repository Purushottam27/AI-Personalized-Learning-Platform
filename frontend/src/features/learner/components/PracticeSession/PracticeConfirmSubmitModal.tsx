import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import Button from '../../../../components/ui/Button';

interface PracticeConfirmSubmitModalProps {
  isOpen: boolean;
  unansweredCount: number;
  totalQuestions: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const PracticeConfirmSubmitModal: React.FC<PracticeConfirmSubmitModalProps> = ({
  isOpen,
  unansweredCount,
  totalQuestions,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const hasUnanswered = unansweredCount > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-surface shadow-2xl p-6 md:p-8 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 ${
                hasUnanswered
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-sage/30 bg-sage-soft text-sage'
              }`}
            >
              {hasUnanswered ? (
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              ) : (
                <CheckCircle className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            <div>
              <h2
                id="submit-modal-title"
                className="font-serif text-xl font-bold text-text-primary"
              >
                Submit Practice Attempt?
              </h2>
              <p className="text-xs text-text-secondary">
                {hasUnanswered
                  ? `${unansweredCount} of ${totalQuestions} questions remaining`
                  : 'All questions have been answered'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Warning / Informative copy */}
        {hasUnanswered ? (
          <div
            role="alert"
            className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1.5"
          >
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              Unanswered Questions Detected
            </p>
            <p className="leading-relaxed">
              You have <strong>{unansweredCount}</strong> unanswered questions. Unanswered questions will receive 0 marks. Once submitted, your score will be calculated and answers cannot be changed.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary leading-relaxed">
            Ready to finalize your practice? Your score and comprehensive answer review will be generated immediately.
          </p>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-error/25 bg-error-soft p-3 text-xs text-error flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="break-words">{errorMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Continue Practicing
          </Button>

          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`cursor-pointer ${
              hasUnanswered
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-sage hover:bg-sage/90 text-white'
            }`}
          >
            {hasUnanswered ? 'Submit Anyway' : 'Submit Practice'}
          </Button>
        </div>
      </div>
    </div>
  );
};
