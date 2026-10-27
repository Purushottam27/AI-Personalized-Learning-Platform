import React from 'react';
import {
  Archive,
  CheckCircle,
  EyeOff,
  Layers3,
  Pencil,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import type { Practice } from '../../types/practice.types';

interface PracticeCardProps {
  practice: Practice;
  canEdit: boolean;
  onEdit: (practice: Practice) => void;
  onPublish: (practice: Practice) => void;
  onArchive: (practice: Practice) => void;
  onRestore: (practice: Practice) => void;
  disabled?: boolean;
}

const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const PracticeCard: React.FC<PracticeCardProps> = ({
  practice,
  canEdit,
  onEdit,
  onPublish,
  onArchive,
  onRestore,
  disabled = false,
}) => {
  const isDraft = practice.status === 'DRAFT';
  const isPublished = practice.status === 'PUBLISHED';
  const isArchived = practice.status === 'ARCHIVED';

  const statusBadge = () => {
    switch (practice.status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/25 bg-sage-soft px-2.5 py-0.5 text-xs font-semibold text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            Published
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-disabled px-2.5 py-0.5 text-xs font-semibold text-text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
            Archived
          </span>
        );
    }
  };

  return (
    <div
      className={`group rounded-2xl border bg-surface p-5 transition-all duration-200 ${
        isArchived
          ? 'border-border/60 opacity-80'
          : 'border-border hover:border-signal/30 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge()}
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-secondary border border-border-muted">
              <Layers3 className="h-3 w-3 text-signal" aria-hidden="true" />
              {practice.questionIds.length}{' '}
              {practice.questionIds.length === 1 ? 'question' : 'questions'}
            </span>
            {practice.contributeToLearningEvidence ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-sage-soft px-2 py-0.5 text-xs font-medium text-sage"
                title="Completed learner attempts contribute to evidence and mastery tracking"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Evidence Enabled
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-tertiary border border-border-muted"
                title="Formative practice only; excluded from evidence and mastery metrics"
              >
                <EyeOff className="h-3 w-3" aria-hidden="true" />
                Formative Only
              </span>
            )}
          </div>

          <h3 className="font-serif text-lg font-semibold text-text-primary break-words">
            {practice.title}
          </h3>

          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
            {practice.description || (
              <span className="italic text-text-tertiary">
                No description provided.
              </span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-start">
          {canEdit && (
            <>
              {isDraft && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPublish(practice)}
                    disabled={disabled}
                    className={`${interactive} border-sage/30 hover:bg-sage-soft hover:text-sage hover:border-sage/50 text-sage`}
                    title={
                      practice.questionIds.length === 0
                        ? 'Practice must contain at least 1 question to publish'
                        : 'Publish this practice for enrolled learners'
                    }
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Publish
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(practice)}
                    disabled={disabled}
                    className={interactive}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(practice)}
                    disabled={disabled}
                    className={`${interactive} text-text-tertiary hover:bg-error-soft hover:text-error`}
                    title="Archive this practice"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </>
              )}

              {isPublished && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(practice)}
                    disabled={disabled}
                    className={interactive}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(practice)}
                    disabled={disabled}
                    className={`${interactive} text-text-tertiary hover:bg-error-soft hover:text-error`}
                    title="Archive this practice"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </>
              )}

              {isArchived && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestore(practice)}
                  disabled={disabled}
                  className={`${interactive} border-signal/30 hover:bg-signal-soft hover:text-signal`}
                  title="Restore this practice to Draft"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Restore to Draft
                </Button>
              )}
            </>
          )}

          {!canEdit && (
            <span className="text-xs text-text-tertiary italic">Read only</span>
          )}
        </div>
      </div>
    </div>
  );
};
