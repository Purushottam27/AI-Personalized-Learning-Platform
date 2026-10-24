import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  BookOpen,
  Check,
  Database,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { getLessonsByTopic } from '../../api/lesson.api';
import {
  archiveQuestion,
  createQuestion,
  getQuestionsByBank,
  restoreQuestion,
  updateQuestion,
} from '../../api/question.api';
import {
  archiveQuestionBank,
  createQuestionBank,
  restoreQuestionBank,
  updateQuestionBank,
} from '../../api/questionBank.api';
import { useTopicQuestionBank } from '../../hooks/useTopicQuestionBank';
import { isApiError } from '../../../../lib/axios';
import type { CourseStatus } from '../../types/instructor.types';
import type { Lesson } from '../../types/lesson.types';
import type {
  CreateQuestionPayload,
  Question,
  UpdateQuestionPayload,
} from '../../types/question.types';
import { QuestionModal } from './QuestionModal';
import { QuestionImportModal } from './QuestionImportModal';

interface QuestionBankManagementProps {
  topicId: string;
  topicTitle: string;
  courseStatus: CourseStatus;
}

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25';
const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export const QuestionBankManagement: React.FC<QuestionBankManagementProps> = ({
  topicId,
  topicTitle,
  courseStatus,
}) => {
  const {
    bank,
    hasBank,
    isLoading: isBankLoading,
    error: bankError,
    refetch: refetchBank,
  } = useTopicQuestionBank(topicId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bank creation/editing modal state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankDescription, setBankDescription] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankModalMode, setBankModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');

  // Question modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Lifecycle confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'ARCHIVE_BANK' | 'RESTORE_BANK' | 'ARCHIVE_QUESTION' | 'RESTORE_QUESTION';
    targetId: string;
    title: string;
    description: string;
  } | null>(null);
  const [isConfirmingLifecycle, setIsConfirmingLifecycle] = useState(false);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLesson, setFilterLesson] = useState<string>('ALL');

  const canEdit = courseStatus === 'DRAFT' && bank?.status === 'ACTIVE';

  // Load questions and topic lessons whenever bank is available
  useEffect(() => {
    let active = true;
    if (!bank) {
      setQuestions([]);
      return;
    }

    const loadData = async () => {
      setIsQuestionsLoading(true);
      try {
        const [qList, lList] = await Promise.all([
          getQuestionsByBank(bank._id),
          getLessonsByTopic(topicId).catch(() => []),
        ]);
        if (active) {
          setQuestions(qList);
          setLessons(lList);
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMessage(getErrorMessage(err));
        }
      } finally {
        if (active) setIsQuestionsLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [bank, topicId]);

  const refreshQuestions = async () => {
    if (!bank) return;
    setIsQuestionsLoading(true);
    try {
      const qList = await getQuestionsByBank(bank._id);
      setQuestions(qList);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  // Open Create Bank modal
  const handleOpenCreateBank = () => {
    setBankTitle(`${topicTitle} Question Bank`);
    setBankDescription('');
    setBankModalMode('CREATE');
    setIsBankModalOpen(true);
    setErrorMessage(null);
  };

  // Open Edit Bank modal
  const handleOpenEditBank = () => {
    if (!bank) return;
    setBankTitle(bank.title);
    setBankDescription(bank.description || '');
    setBankModalMode('EDIT');
    setIsBankModalOpen(true);
    setErrorMessage(null);
  };

  // Submit Bank Create / Edit
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bankTitle.trim().length < 3 || bankTitle.trim().length > 150) {
      setErrorMessage('Bank title must be between 3 and 150 characters.');
      return;
    }
    if (bankDescription.trim().length > 500) {
      setErrorMessage('Description cannot exceed 500 characters.');
      return;
    }

    setIsSavingBank(true);
    setErrorMessage(null);
    try {
      if (bankModalMode === 'CREATE') {
        await createQuestionBank(topicId, {
          title: bankTitle.trim(),
          description: bankDescription.trim() || undefined,
        });
        setActionMessage('Question bank created successfully.');
      } else if (bank) {
        await updateQuestionBank(bank._id, {
          title: bankTitle.trim(),
          description: bankDescription.trim(),
        });
        setActionMessage('Question bank updated successfully.');
      }
      setIsBankModalOpen(false);
      await refetchBank();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsSavingBank(false);
    }
  };

  // Question Creation / Edit
  const handleOpenCreateQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionModalOpen(true);
    setErrorMessage(null);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setIsQuestionModalOpen(true);
    setErrorMessage(null);
  };

  const handleSubmitQuestion = async (
    payload: CreateQuestionPayload | UpdateQuestionPayload,
  ) => {
    if (!bank) return;
    setIsSavingQuestion(true);
    setErrorMessage(null);
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion._id, payload);
        setActionMessage('Question updated successfully.');
      } else {
        await createQuestion(bank._id, payload as CreateQuestionPayload);
        setActionMessage('Question added to bank.');
      }
      setIsQuestionModalOpen(false);
      await refreshQuestions();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Lifecycle execution
  const executeLifecycleAction = async () => {
    if (!confirmModal) return;
    setIsConfirmingLifecycle(true);
    setErrorMessage(null);
    try {
      switch (confirmModal.type) {
        case 'ARCHIVE_BANK':
          await archiveQuestionBank(confirmModal.targetId);
          setActionMessage('Question bank archived.');
          await refetchBank();
          break;
        case 'RESTORE_BANK':
          await restoreQuestionBank(confirmModal.targetId);
          setActionMessage('Question bank restored to active.');
          await refetchBank();
          break;
        case 'ARCHIVE_QUESTION':
          await archiveQuestion(confirmModal.targetId);
          setActionMessage('Question archived.');
          await refreshQuestions();
          break;
        case 'RESTORE_QUESTION':
          await restoreQuestion(confirmModal.targetId);
          setActionMessage('Question restored to active.');
          await refreshQuestions();
          break;
      }
      setConfirmModal(null);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsConfirmingLifecycle(false);
    }
  };

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesOption = q.options?.some((opt) => opt.text.toLowerCase().includes(query));
        const matchesExplanation = q.explanation?.toLowerCase().includes(query);
        if (!matchesText && !matchesOption && !matchesExplanation) return false;
      }

      if (filterType !== 'ALL' && q.type !== filterType) return false;
      if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
      if (filterStatus !== 'ALL' && q.status !== filterStatus) return false;
      if (filterLesson !== 'ALL') {
        if (filterLesson === 'UNASSIGNED') {
          if (q.lessonId) return false;
        } else if (q.lessonId !== filterLesson) {
          return false;
        }
      }

      return true;
    });
  }, [questions, searchQuery, filterType, filterDifficulty, filterStatus, filterLesson]);

  if (isBankLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-signal" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Loading Question Bank…</p>
      </div>
    );
  }

  if (bankError) {
    return (
      <div className="rounded-2xl border border-error/20 bg-error-soft/30 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-error" aria-hidden="true" />
        <h3 className="mt-2 font-serif text-lg font-semibold text-text-primary">Unable to load Question Bank</h3>
        <p className="mt-1 text-sm text-text-secondary">{bankError}</p>
        <Button variant="secondary" size="sm" onClick={() => void refetchBank()} className={`mt-4 ${interactive}`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
        </Button>
      </div>
    );
  }

  // No Question Bank exists for this topic
  if (!hasBank || !bank) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal border border-signal/20">
          <Database className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold text-text-primary">No Question Bank for this Topic</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          A question bank provides a reusable pool of assessed items for practice sessions, diagnostics, and topic assessments.
        </p>

        {courseStatus === 'DRAFT' ? (
          <div className="mt-6">
            <Button variant="primary" onClick={handleOpenCreateBank} className={interactive}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Question Bank
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs font-semibold text-text-tertiary">
            Course is {courseStatus.toLowerCase()}. Question banks can only be created in draft mode.
          </p>
        )}

        {/* Bank Creation Modal */}
        {isBankModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs text-left"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
                <h3 className="font-serif text-lg font-semibold text-text-primary">Create Question Bank</h3>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBank} className="space-y-4 p-6">
                {errorMessage && (
                  <div className="rounded-xl border border-error/20 bg-error-soft p-3 text-xs text-error">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="create-bank-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Bank Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="create-bank-title"
                    required
                    minLength={3}
                    maxLength={150}
                    value={bankTitle}
                    onChange={(e) => setBankTitle(e.target.value)}
                    placeholder="e.g. Algorithms & Data Structures Bank"
                    className={fieldClass}
                  />
                  <div className="flex justify-between text-[11px] text-text-tertiary">
                    <span>3–150 characters</span>
                    <span>{bankTitle.length}/150</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="create-bank-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Description <span className="font-normal normal-case text-text-tertiary">(optional)</span>
                  </label>
                  <textarea
                    id="create-bank-description"
                    rows={3}
                    maxLength={500}
                    value={bankDescription}
                    onChange={(e) => setBankDescription(e.target.value)}
                    placeholder="Describe the scope or objectives covered by questions in this bank."
                    className={fieldClass}
                  />
                  <p className="text-right text-[11px] text-text-tertiary">{bankDescription.length}/500</p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsBankModalOpen(false)}
                    disabled={isSavingBank}
                    className={interactive}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSavingBank} className={interactive}>
                    Create Bank
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active or Archived Question Bank
  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionMessage && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-sage/80 hover:text-sage">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-error/80 hover:text-error">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Bank Header Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex flex-col gap-4 border-b border-border bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border text-signal">
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h2 className="font-serif text-xl font-semibold text-text-primary">{bank.title}</h2>
              {bank.status === 'ARCHIVED' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Archive className="h-3 w-3" /> Archived
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-semibold text-sage">
                  <Check className="h-3 w-3" /> Active
                </span>
              )}
            </div>
            {bank.description && (
              <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">{bank.description}</p>
            )}
          </div>

          {/* Bank Level Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {courseStatus === 'DRAFT' && (
              <>
                {bank.status === 'ACTIVE' ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleOpenEditBank} className={interactive}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit Bank
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirmModal({
                          type: 'ARCHIVE_BANK',
                          targetId: bank._id,
                          title: 'Archive Question Bank',
                          description:
                            'Archiving this question bank will prevent adding or modifying its questions. Questions in published assessments or practices cannot be archived.',
                        })
                      }
                      className={`${interactive} text-amber-600 hover:text-amber-700 dark:text-amber-400`}
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      Archive Bank
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setConfirmModal({
                        type: 'RESTORE_BANK',
                        targetId: bank._id,
                        title: 'Restore Question Bank',
                        description: 'Restoring this question bank will re-enable question additions and modifications.',
                      })
                    }
                    className={`${interactive} text-sage hover:text-sage-hover`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Restore Bank
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Bar: Counts & Add / Import Buttons */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-muted bg-surface">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-full bg-surface-elevated px-3 py-1 font-semibold text-text-primary border border-border">
              {questions.length} Question{questions.length === 1 ? '' : 's'}
            </span>
            <span className="text-text-tertiary">·</span>
            <span>{questions.filter((q) => q.status === 'ACTIVE').length} Active</span>
            <span className="text-text-tertiary">·</span>
            <span>{questions.filter((q) => q.status === 'ARCHIVED').length} Archived</span>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} className={interactive}>
                <FileSpreadsheet className="h-4 w-4 text-signal" aria-hidden="true" />
                Import Questions
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenCreateQuestion} className={interactive}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Question
              </Button>
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div className="grid gap-2.5 p-4 sm:grid-cols-2 md:grid-cols-6 bg-surface-elevated/40 border-b border-border-muted">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search questions or options…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus:border-focus"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2 px-2.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus:border-focus"
            >
              <option value="ALL">All Types</option>
              <option value="MCQ_SINGLE">MCQ (Single)</option>
              <option value="MCQ_MULTIPLE">MCQ (Multiple)</option>
              <option value="TRUE_FALSE">True / False</option>
            </select>
          </div>

          <div>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2 px-2.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus:border-focus"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2 px-2.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus:border-focus"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
          </div>

          <div>
            <select
              value={filterLesson}
              onChange={(e) => setFilterLesson(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2 px-2.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus:border-focus"
            >
              <option value="ALL">All Lessons</option>
              <option value="UNASSIGNED">Topic-wide (No Lesson)</option>
              {lessons.map((lesson) => (
                <option key={lesson._id} value={lesson._id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="divide-y divide-border">
          {isQuestionsLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8">
              <Loader2 className="h-6 w-6 animate-spin text-signal" aria-hidden="true" />
              <p className="text-xs text-text-secondary">Loading questions…</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-text-primary">No questions found</p>
              <p className="text-xs text-text-secondary">
                {questions.length === 0
                  ? 'This bank does not have any questions yet. Add one manually or import from a spreadsheet.'
                  : 'No questions match the selected filter criteria.'}
              </p>
            </div>
          ) : (
            filteredQuestions.map((q, index) => {
              const lessonMatch = lessons.find((l) => l._id === q.lessonId);
              const isQArchived = q.status === 'ARCHIVED';

              return (
                <div
                  key={q._id}
                  className={`p-5 transition-colors ${
                    isQArchived ? 'bg-surface-disabled/40 opacity-80' : 'hover:bg-surface-elevated/60'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-text-tertiary">
                          #{String(index + 1).padStart(2, '0')}
                        </span>

                        <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                          {q.type === 'MCQ_SINGLE'
                            ? 'MCQ (Single)'
                            : q.type === 'MCQ_MULTIPLE'
                              ? 'MCQ (Multiple)'
                              : 'True / False'}
                        </span>

                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            q.difficulty === 'EASY'
                              ? 'bg-sage-soft text-sage'
                              : q.difficulty === 'MEDIUM'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-error-soft text-error'
                          }`}
                        >
                          {q.difficulty}
                        </span>

                        <span className="rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                          {q.marks} Mark{q.marks === 1 ? '' : 's'}
                        </span>

                        {lessonMatch && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-signal-soft/50 border border-signal/20 px-2 py-0.5 text-[11px] font-semibold text-signal">
                            <BookOpen className="h-3 w-3" />
                            {lessonMatch.title}
                          </span>
                        )}

                        {isQArchived && (
                          <span className="rounded-md bg-surface-disabled px-2 py-0.5 text-[11px] font-bold text-text-tertiary">
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-text-primary leading-snug">{q.questionText}</p>

                      {/* Options List */}
                      {q.type === 'TRUE_FALSE' ? (
                        <div className="flex gap-4 pt-1 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${
                              q.correctAnswer === 'TRUE'
                                ? 'bg-sage-soft text-sage border border-sage/30'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {q.correctAnswer === 'TRUE' && <Check className="h-3.5 w-3.5" />} True
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${
                              q.correctAnswer === 'FALSE'
                                ? 'bg-sage-soft text-sage border border-sage/30'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {q.correctAnswer === 'FALSE' && <Check className="h-3.5 w-3.5" />} False
                          </span>
                        </div>
                      ) : (
                        <div className="grid gap-1.5 sm:grid-cols-2 pt-1 text-xs">
                          {q.options?.map((opt) => {
                            const isCorrect =
                              q.type === 'MCQ_SINGLE'
                                ? q.correctAnswer === opt.key
                                : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.key);

                            return (
                              <div
                                key={opt.key}
                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                                  isCorrect
                                    ? 'border-sage/40 bg-sage-soft/30 text-text-primary'
                                    : 'border-border-muted bg-surface/60 text-text-secondary'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                                    isCorrect ? 'bg-sage text-paper' : 'bg-surface-disabled text-text-tertiary'
                                  }`}
                                >
                                  {isCorrect ? <Check className="h-3 w-3" /> : opt.key}
                                </span>
                                <span className="truncate">{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <p className="text-xs text-text-tertiary italic pt-0.5">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>

                    {/* Question Action Buttons */}
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1.5 sm:self-center">
                        {!isQArchived ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(q)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-text-tertiary hover:text-text-primary ${interactive}`}
                              title="Edit Question"
                              aria-label="Edit Question"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  type: 'ARCHIVE_QUESTION',
                                  targetId: q._id,
                                  title: 'Archive Question',
                                  description:
                                    'Archived questions cannot be used in new assessments or practice tests. Questions in published assessments cannot be archived.',
                                })
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 ${interactive}`}
                              title="Archive Question"
                              aria-label="Archive Question"
                            >
                              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                type: 'RESTORE_QUESTION',
                                targetId: q._id,
                                title: 'Restore Question',
                                description: 'Reactivate this question so it can be included in future practices and assessments.',
                              })
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-sage hover:text-sage ${interactive}`}
                            title="Restore Question"
                            aria-label="Restore Question"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Bank Modal */}
      {isBankModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs text-left"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
              <h3 className="font-serif text-lg font-semibold text-text-primary">Edit Question Bank</h3>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label htmlFor="edit-bank-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Bank Title <span className="text-error">*</span>
                </label>
                <input
                  id="edit-bank-title"
                  required
                  minLength={3}
                  maxLength={150}
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bank-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Description <span className="font-normal normal-case text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  id="edit-bank-description"
                  rows={3}
                  maxLength={500}
                  value={bankDescription}
                  onChange={(e) => setBankDescription(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsBankModalOpen(false)}
                  disabled={isSavingBank}
                  className={interactive}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSavingBank} className={interactive}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSubmit={handleSubmitQuestion}
        initialQuestion={editingQuestion}
        lessons={lessons}
        isSubmitting={isSavingQuestion}
      />

      {/* Question Import Modal */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        questionBankId={bank._id}
        onSuccess={async () => {
          await refreshQuestions();
        }}
      />

      {/* Lifecycle Confirmation Modal (Archive/Restore) */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmModal.type.startsWith('ARCHIVE')
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-sage-soft text-sage'
                }`}
              >
                {confirmModal.type.startsWith('ARCHIVE') ? (
                  <Archive className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-text-primary">{confirmModal.title}</h3>
                <p className="text-xs leading-relaxed text-text-secondary">{confirmModal.description}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmModal(null)}
                disabled={isConfirmingLifecycle}
                className={interactive}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={executeLifecycleAction}
                loading={isConfirmingLifecycle}
                className={interactive}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default QuestionBankManagement;
