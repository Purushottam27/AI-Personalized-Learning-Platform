import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  Database,
  Loader2,
  Search,
  Square,
} from 'lucide-react';
import type { Question, QuestionDifficulty, QuestionType } from '../../types/question.types';
import type { QuestionBank } from '../../types/questionBank.types';

interface AssessmentQuestionSelectorProps {
  bank: QuestionBank | null;
  hasBank: boolean;
  isBankLoading: boolean;
  availableQuestions: Question[];
  isQuestionsLoading: boolean;
  selectedQuestionIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  questionsPerAttempt: number;
  disabled?: boolean;
}

export const AssessmentQuestionSelector: React.FC<AssessmentQuestionSelectorProps> = ({
  bank,
  hasBank,
  isBankLoading,
  availableQuestions,
  isQuestionsLoading,
  selectedQuestionIds,
  onChangeSelectedIds,
  questionsPerAttempt,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (disabled) return;
    if (selectedQuestionIds.includes(questionId)) {
      onChangeSelectedIds(selectedQuestionIds.filter((id) => id !== questionId));
      setErrorMessage(null);
    } else {
      if (selectedQuestionIds.length >= 200) {
        setErrorMessage('An assessment question pool cannot exceed 200 questions.');
        return;
      }
      setErrorMessage(null);
      onChangeSelectedIds([...selectedQuestionIds, questionId]);
    }
  };

  const handleSelectAllFiltered = () => {
    if (disabled) return;
    const filteredIds = filteredQuestions.map((q) => q._id);
    const merged = Array.from(new Set([...selectedQuestionIds, ...filteredIds]));
    if (merged.length > 200) {
      setErrorMessage('Cannot select more than 200 questions.');
      onChangeSelectedIds(merged.slice(0, 200));
      return;
    }
    setErrorMessage(null);
    onChangeSelectedIds(merged);
  };

  const handleDeselectAllFiltered = () => {
    if (disabled) return;
    const filteredIdsSet = new Set(filteredQuestions.map((q) => q._id));
    onChangeSelectedIds(selectedQuestionIds.filter((id) => !filteredIdsSet.has(id)));
    setErrorMessage(null);
  };

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
    <div className="space-y-3 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-muted pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Database className="h-4 w-4 text-signal" aria-hidden="true" />
            Question Bank Selection
          </h3>
          <p className="text-xs text-text-secondary">
            Choose questions from this topic's Question Bank to form the assessment question pool.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
              selectedQuestionIds.length >= questionsPerAttempt
                ? 'bg-signal-soft border-signal/20 text-signal'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-500'
            }`}
          >
            {selectedQuestionIds.length} of {availableQuestions.length} selected
            {selectedQuestionIds.length < questionsPerAttempt && ` (min ${questionsPerAttempt} needed)`}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3 text-xs text-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="break-words">{errorMessage}</p>
        </div>
      )}

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
            You must create a Question Bank and add active questions to this topic before creating an assessment.
          </p>
        </div>
      ) : isQuestionsLoading ? (
        <div className="flex items-center justify-center p-8 gap-2 text-text-secondary text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-signal" />
          Loading bank questions...
        </div>
      ) : availableQuestions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text-secondary space-y-1">
          <p className="font-semibold text-text-primary">No Active Questions in Bank</p>
          <p className="text-xs text-text-tertiary">
            The Question Bank for this topic does not have any active questions yet. Add questions to the bank first.
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
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary outline-none hover:border-text-tertiary cursor-pointer"
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
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary outline-none hover:border-text-tertiary cursor-pointer"
                aria-label="Filter by difficulty"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions & Count */}
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span>
              Showing {filteredQuestions.length} of {availableQuestions.length} questions
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-signal hover:underline font-medium cursor-pointer"
              >
                Select all filtered
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="text-text-tertiary hover:text-text-primary cursor-pointer"
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
                        <span>
                          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                        </span>
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
  );
};
