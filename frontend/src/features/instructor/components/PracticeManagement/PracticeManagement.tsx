import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import {
  archivePractice,
  createPractice,
  publishPractice,
  restorePractice,
  updatePractice,
} from '../../api/practice.api';
import { useTopicPractices } from '../../hooks/useTopicPractices';
import { isApiError } from '../../../../lib/axios';
import type { CourseStatus } from '../../types/instructor.types';
import type {
  CreatePracticePayload,
  Practice,
  PracticeFilterStatus,
  UpdatePracticePayload,
} from '../../types/practice.types';
import { PracticeCard } from './PracticeCard';
import { PracticeModal } from './PracticeModal';
import { PracticeConfirmModal } from './PracticeConfirmModal';
import type { PracticeConfirmAction } from './PracticeConfirmModal';

interface PracticeManagementProps {
  topicId: string;
  topicTitle: string;
  courseStatus: CourseStatus;
}

const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export const PracticeManagement: React.FC<PracticeManagementProps> = ({
  topicId,
  topicTitle,
  courseStatus,
}) => {
  const { practices, isLoading, error: fetchError, refetch } = useTopicPractices(topicId);

  const [statusFilter, setStatusFilter] = useState<PracticeFilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [activePractice, setActivePractice] = useState<Practice | null>(null);

  // Confirm lifecycle modal state
  const [confirmModalAction, setConfirmModalAction] = useState<PracticeConfirmAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // General feedback messages
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = courseStatus === 'DRAFT';

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      ALL: practices.length,
      DRAFT: practices.filter((p) => p.status === 'DRAFT').length,
      PUBLISHED: practices.filter((p) => p.status === 'PUBLISHED').length,
      ARCHIVED: practices.filter((p) => p.status === 'ARCHIVED').length,
    };
  }, [practices]);

  // Filtered practices
  const filteredPractices = useMemo(() => {
    return practices.filter((practice) => {
      if (statusFilter !== 'ALL' && practice.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = practice.title.toLowerCase().includes(query);
        const matchesDesc = (practice.description ?? '').toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [practices, statusFilter, searchQuery]);

  // Handlers for modal actions
  const openCreateModal = () => {
    if (!canEdit) return;
    setFormMode('CREATE');
    setActivePractice(null);
    setErrorMessage(null);
    setActionMessage(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (practice: Practice) => {
    if (!canEdit) return;
    setFormMode('EDIT');
    setActivePractice(practice);
    setErrorMessage(null);
    setActionMessage(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (payload: CreatePracticePayload | UpdatePracticePayload) => {
    if (formMode === 'CREATE') {
      const created = await createPractice(topicId, payload as CreatePracticePayload);
      setActionMessage(`Practice "${created.title}" created successfully as draft.`);
    } else if (formMode === 'EDIT' && activePractice) {
      const updated = await updatePractice(activePractice._id, payload as UpdatePracticePayload);
      setActionMessage(`Practice "${updated.title}" updated successfully.`);
    }
    await refetch();
  };

  const openPublishModal = (practice: Practice) => {
    setActivePractice(practice);
    setConfirmModalAction('PUBLISH');
    setConfirmError(null);
  };

  const openArchiveModal = (practice: Practice) => {
    setActivePractice(practice);
    setConfirmModalAction('ARCHIVE');
    setConfirmError(null);
  };

  const openRestoreModal = (practice: Practice) => {
    setActivePractice(practice);
    setConfirmModalAction('RESTORE');
    setConfirmError(null);
  };

  const closeConfirmModal = () => {
    if (isConfirming) return;
    setConfirmModalAction(null);
    setActivePractice(null);
    setConfirmError(null);
  };

  const handleConfirmLifecycle = async () => {
    if (!activePractice || !confirmModalAction) return;

    setIsConfirming(true);
    setConfirmError(null);

    try {
      if (confirmModalAction === 'PUBLISH') {
        const updated = await publishPractice(activePractice._id);
        setActionMessage(`Practice "${updated.title}" has been published.`);
      } else if (confirmModalAction === 'ARCHIVE') {
        const updated = await archivePractice(activePractice._id);
        setActionMessage(`Practice "${updated.title}" has been archived.`);
      } else if (confirmModalAction === 'RESTORE') {
        const updated = await restorePractice(activePractice._id);
        setActionMessage(`Practice "${updated.title}" restored to Draft.`);
      }

      closeConfirmModal();
      await refetch();
    } catch (err: unknown) {
      setConfirmError(getErrorMessage(err));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Action Message */}
      {actionMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-sage/70 hover:text-sage"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {(errorMessage || fetchError) && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/25 bg-error-soft p-4 text-sm text-error animate-in fade-in duration-150"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 flex-1">
            <p className="font-semibold">Unable to complete request</p>
            <p className="text-xs text-error/90">{errorMessage || fetchError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setErrorMessage(null);
              void refetch();
            }}
            className="text-xs text-error hover:bg-error/10"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            Practice Sets
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Create question-based formative practice activities for &ldquo;{topicTitle}&rdquo;.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canEdit ? (
            <Button
              onClick={openCreateModal}
              className={`${interactive} bg-signal text-white hover:bg-signal-hover`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Practice
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-disabled px-3 py-1.5 text-xs font-semibold text-text-secondary">
              Read only
            </span>
          )}
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border-muted pb-4">
        {/* Status Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter practices by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: 'ALL', label: 'All', count: counts.ALL },
              { id: 'DRAFT', label: 'Drafts', count: counts.DRAFT },
              { id: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED },
              { id: 'ARCHIVED', label: 'Archived', count: counts.ARCHIVED },
            ] as const
          ).map(({ id, label, count }) => {
            const selected = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-signal-soft text-signal font-semibold border border-signal/20'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary border border-transparent'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    selected
                      ? 'bg-signal/20 text-signal font-bold'
                      : 'bg-surface-elevated text-text-tertiary'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search practices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-text-tertiary hover:text-text-primary"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Practices List Content */}
      {isLoading ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-8">
          <Loader2 className="h-6 w-6 animate-spin text-signal" aria-hidden="true" />
          <p className="text-xs text-text-secondary">Loading practice sets...</p>
        </div>
      ) : filteredPractices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-text-secondary">
            <Layers3 className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-serif text-lg font-semibold text-text-primary">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No matching practice sets'
                : 'No practice sets created yet'}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try clearing your search query or switching the status filter.'
                : 'Practice sets help learners reinforce learning with immediate feedback after answering questions.'}
            </p>
          </div>

          {canEdit && practices.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={openCreateModal}
              className={`${interactive} mx-auto`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first practice set
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1">
          {filteredPractices.map((practice) => (
            <PracticeCard
              key={practice._id}
              practice={practice}
              canEdit={canEdit}
              onEdit={openEditModal}
              onPublish={openPublishModal}
              onArchive={openArchiveModal}
              onRestore={openRestoreModal}
              disabled={isConfirming}
            />
          ))}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <PracticeModal
        isOpen={isFormModalOpen}
        mode={formMode}
        practice={activePractice}
        topicId={topicId}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmation Modal (Publish / Archive / Restore) */}
      <PracticeConfirmModal
        isOpen={confirmModalAction !== null}
        action={confirmModalAction}
        practice={activePractice}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmLifecycle}
        isSubmitting={isConfirming}
        errorMessage={confirmError}
      />
    </div>
  );
};
