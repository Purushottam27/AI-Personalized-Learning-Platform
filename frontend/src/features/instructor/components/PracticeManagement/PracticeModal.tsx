import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  Database,
  Layers3,
  Loader2,
  Save,
  Search,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { getQuestionsByBank } from '../../api/question.api';
import { useTopicQuestionBank } from '../../hooks/useTopicQuestionBank';
import { isApiError } from '../../../../lib/axios';
import type { Question, QuestionDifficulty, QuestionType } from '../../types/question.types';
import type { CreatePracticePayload, Practice, UpdatePracticePayload } from '../../types/practice.types';

interface PracticeModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  practice?: Practice | null;
  topicId: string;
  onClose: () => void;
  onSubmit: (payload: CreatePracticePayload | UpdatePracticePayload) => Promise<void>;
}

const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const PracticeModal: React.FC<PracticeModalProps> = ({
  isOpen,
  mode,
  practice,
  topicId,
  onClose,
  onSubmit,
}) => {
  const { bank, hasBank, isLoading: isBankLoading } = useTopicQuestionBank(topicId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contributeToLearningEvidence, setContributeToLearningEvidence] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Question bank items & picker state
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'EDIT' && practice) {
      setTitle(practice.title);
      setDescription(practice.description ?? '');
      setContributeToLearningEvidence(practice.contributeToLearningEvidence ?? true);
      setSelectedQuestionIds(practice.questionIds ? [...practice.questionIds] : []);
    } else {
      setTitle('');
      setDescription('');
      setContributeToLearningEvidence(true);
      setSelectedQuestionIds([]);
    }

    setSearchQuery('');
    setFilterType('ALL');
    setFilterDifficulty('ALL');
    setErrorMessage(null);
  }, [isOpen, mode, practice]);

  // Load questions from QuestionBank
  useEffect(() => {
    if (!isOpen || !bank) return;

    let active = true;
    setIsQuestionsLoading(true);

    getQuestionsByBank(bank._id)
      .then((questions) => {
        if (active) {
          // Only active questions are eligible for selection
          const activeOnly = questions.filter((q) => q.status === 'ACTIVE');
          setAvailableQuestions(activeOnly);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMessage(
            isApiError(err)
              ? err.message
              : 'Failed to load questions from Question Bank.',
          );
        }
      })
      .finally(() => {
        if (active) setIsQuestionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, bank]);

  // Filtered view of questions for picker
  const filteredQuestions = useMemo(() => {
    return availableQuestions.filter((q) => {
      if (filterType !== 'ALL' && q.type !== filterType) return false;
      if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return q.questionText.toLowerCase().includes(query);
      }
      return true;
    });
  }, [availableQuestions, filterType, filterDifficulty, searchQuery]);

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((current) => {
      if (current.includes(questionId)) {
        return current.filter((id) => id !== questionId);
      }
      if (current.length >= 200) {
        setErrorMessage('A practice set cannot exceed 200 questions.');
        return current;
      }
      setErrorMessage(null);
      return [...current, questionId];
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredQuestions.map((q) => q._id);
    setSelectedQuestionIds((current) => {
      const merged = Array.from(new Set([...current, ...filteredIds]));
      if (merged.length > 200) {
        setErrorMessage('Cannot select more than 200 questions.');
        return merged.slice(0, 200);
      }
      setErrorMessage(null);
      return merged;
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredQuestions.map((q) => q._id));
    setSelectedQuestionIds((current) => current.filter((id) => !filteredIdsSet.has(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
      setErrorMessage('Practice title must be between 3 and 150 characters.');
      return;
    }

    if (description.length > 1000) {
      setErrorMessage('Description cannot exceed 1000 characters.');
      return;
    }

    // Published practice cannot be emptied
    if (mode === 'EDIT' && practice?.status === 'PUBLISHED' && selectedQuestionIds.length === 0) {
      setErrorMessage('A published practice must keep at least one question.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: CreatePracticePayload | UpdatePracticePayload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        questionIds: selectedQuestionIds,
        contributeToLearningEvidence,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        isApiError(err)
          ? err.message
          : 'Failed to save practice set. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const typeLabel = (type: QuestionType) => {
    switch (type) {
      case 'MCQ_SINGLE':
        return 'Single Choice';
      case 'MCQ_MULTIPLE':
        return 'Multiple Choice';
      case 'TRUE_FALSE':
        return 'True / False';
    }
  };

  const difficultyBadge = (difficulty: QuestionDifficulty) => {
    switch (difficulty) {
      case 'EASY':
        return (
          <span className="inline-flex items-center rounded-md bg-sage-soft px-1.5 py-0.5 text-[10px] font-semibold text-sage">
            Easy
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
            Medium
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center rounded-md bg-error-soft px-1.5 py-0.5 text-[10px] font-semibold text-error">
            Hard
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal">
              <Layers3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="practice-modal-title"
                className="font-serif text-xl font-semibold text-text-primary"
              >
                {mode === 'CREATE' ? 'Create Practice Set' : 'Edit Practice Set'}
              </h2>
              <p className="text-xs text-text-secondary">
                Configure practice session details and choose questions from the question bank.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close dialog"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary ${interactive}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <form id="practice-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3 text-xs text-error"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="break-words">{errorMessage}</p>
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="practice-title"
              className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              Practice Title <span className="text-error">*</span>
            </label>
            <input
              id="practice-title"
              type="text"
              required
              minLength={3}
              maxLength={150}
              placeholder="e.g., Quick Check: Normalization Basics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>3–150 characters</span>
              <span>{title.length}/150</span>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="practice-description"
              className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              Description <span className="font-normal normal-case text-text-tertiary">(optional)</span>
            </label>
            <textarea
              id="practice-description"
              rows={2}
              maxLength={1000}
              placeholder="Briefly describe what this practice covers and what learners should focus on."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Max 1000 characters</span>
              <span>{description.length}/1000</span>
            </div>
          </div>

          {/* Learning Evidence Toggle */}
          <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                  Contribute to Learning Evidence
                </span>
                <p className="text-xs text-text-secondary">
                  When enabled, completed attempts record mastery evidence and inform targeted recommendations.
                  When disabled, attempts remain strictly formative practice.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={contributeToLearningEvidence}
                  onChange={(e) => setContributeToLearningEvidence(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-disabled peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-focus rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-signal"></div>
              </label>
            </div>
          </div>

          {/* Question Bank Picker Section */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-muted pb-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Database className="h-4 w-4 text-signal" aria-hidden="true" />
                  Question Bank Selection
                </h3>
                <p className="text-xs text-text-secondary">
                  Choose questions from this topic's Question Bank to include in the practice set.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-signal-soft border border-signal/20 px-2.5 py-1 text-xs font-semibold text-signal">
                  {selectedQuestionIds.length} of {availableQuestions.length} selected
                </span>
              </div>
            </div>

            {/* Check Question Bank Availability */}
            {isBankLoading ? (
              <div className="flex items-center justify-center p-8 gap-2 text-text-secondary text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-signal" />
                Loading Question Bank...
              </div>
            ) : !hasBank || !bank ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-500 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  No Question Bank Found
                </p>
                <p className="text-xs text-text-secondary">
                  You must create a Question Bank and add questions to this topic before you can assign questions to a practice set.
                </p>
              </div>
            ) : isQuestionsLoading ? (
              <div className="flex items-center justify-center p-8 gap-2 text-text-secondary text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-signal" />
                Loading questions...
              </div>
            ) : availableQuestions.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text-secondary space-y-1">
                <p className="font-semibold text-text-primary">No Active Questions in Bank</p>
                <p className="text-xs text-text-tertiary">
                  The Question Bank for this topic does not have any active questions yet. Add active questions to the bank first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search question text..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary outline-none hover:border-text-tertiary"
                      aria-label="Filter by question type"
                    >
                      <option value="ALL">All Types</option>
                      <option value="MCQ_SINGLE">Single Choice</option>
                      <option value="MCQ_MULTIPLE">Multiple Choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                    </select>

                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary outline-none hover:border-text-tertiary"
                      aria-label="Filter by difficulty"
                    >
                      <option value="ALL">All Difficulties</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center justify-between text-xs text-text-secondary px-1">
                  <span>
                    Showing {filteredQuestions.length} of {availableQuestions.length} questions
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-signal hover:underline font-medium"
                    >
                      Select all filtered
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      Deselect all filtered
                    </button>
                  </div>
                </div>

                {/* Questions Checklist */}
                <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface-elevated/50 p-2 space-y-1.5 divide-y divide-border/40">
                  {filteredQuestions.length === 0 ? (
                    <p className="p-4 text-center text-xs text-text-tertiary">
                      No questions match your search or filter criteria.
                    </p>
                  ) : (
                    filteredQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q._id);
                      return (
                        <div
                          key={q._id}
                          onClick={() => toggleQuestionSelection(q._id)}
                          className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors pt-2.5 first:pt-2.5 ${
                            isSelected
                              ? 'bg-signal-soft/40 border border-signal/25'
                              : 'hover:bg-surface-elevated border border-transparent'
                          }`}
                        >
                          <div className="pt-0.5 text-signal shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4 text-text-tertiary" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
                              {q.questionText}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-secondary">
                              <span className="rounded bg-surface px-1.5 py-0.5 border border-border-muted font-medium">
                                {typeLabel(q.type)}
                              </span>
                              {difficultyBadge(q.difficulty)}
                              <span className="text-text-tertiary">·</span>
                              <span>{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between border-t border-border bg-surface-elevated px-6 py-4 gap-3 shrink-0">
          <p className="text-xs text-text-tertiary">
            {selectedQuestionIds.length === 0 ? (
              <span className="text-amber-500 font-medium">
                Note: At least 1 question is required before publishing.
              </span>
            ) : (
              <span>{selectedQuestionIds.length} questions will be included.</span>
            )}
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              className={interactive}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="practice-form"
              loading={isSaving}
              disabled={isSaving}
              className={interactive}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {mode === 'CREATE' ? 'Create Practice' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
