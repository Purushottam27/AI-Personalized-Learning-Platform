import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Plus, Trash2, X } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import type { Lesson } from '../../types/lesson.types';
import type {
  CreateQuestionPayload,
  Question,
  QuestionDifficulty,
  QuestionOption,
  QuestionType,
  UpdateQuestionPayload,
} from '../../types/question.types';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateQuestionPayload | UpdateQuestionPayload) => Promise<void>;
  initialQuestion?: Question | null;
  lessons: Lesson[];
  isSubmitting: boolean;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25';
const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialQuestion,
  lessons,
  isSubmitting,
}) => {
  const isEditing = Boolean(initialQuestion);

  const [questionText, setQuestionText] = useState('');
  const [type, setType] = useState<QuestionType>('MCQ_SINGLE');
  const [options, setOptions] = useState<QuestionOption[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [singleCorrectAnswer, setSingleCorrectAnswer] = useState<string>('A');
  const [multipleCorrectAnswers, setMultipleCorrectAnswers] = useState<string[]>(['A', 'B']);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'TRUE' | 'FALSE'>('TRUE');
  const [marks, setMarks] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('EASY');
  const [lessonId, setLessonId] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestionText(initialQuestion.questionText);
      setType(initialQuestion.type);
      setMarks(initialQuestion.marks);
      setDifficulty(initialQuestion.difficulty);
      setLessonId(initialQuestion.lessonId ?? '');
      setExplanation(initialQuestion.explanation ?? '');

      if (initialQuestion.type === 'TRUE_FALSE') {
        setTrueFalseAnswer(initialQuestion.correctAnswer === 'FALSE' ? 'FALSE' : 'TRUE');
      } else if (initialQuestion.type === 'MCQ_SINGLE') {
        setOptions(
          initialQuestion.options.length >= 2
            ? initialQuestion.options.map((opt) => ({ key: opt.key, text: opt.text }))
            : [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
              ],
        );
        setSingleCorrectAnswer(
          typeof initialQuestion.correctAnswer === 'string'
            ? initialQuestion.correctAnswer
            : initialQuestion.options[0]?.key ?? 'A',
        );
      } else if (initialQuestion.type === 'MCQ_MULTIPLE') {
        setOptions(
          initialQuestion.options.length >= 2
            ? initialQuestion.options.map((opt) => ({ key: opt.key, text: opt.text }))
            : [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
              ],
        );
        setMultipleCorrectAnswers(
          Array.isArray(initialQuestion.correctAnswer)
            ? initialQuestion.correctAnswer
            : [initialQuestion.options[0]?.key ?? 'A', initialQuestion.options[1]?.key ?? 'B'],
        );
      }
    } else {
      setQuestionText('');
      setType('MCQ_SINGLE');
      setOptions([
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ]);
      setSingleCorrectAnswer('A');
      setMultipleCorrectAnswers(['A', 'B']);
      setTrueFalseAnswer('TRUE');
      setMarks(1);
      setDifficulty('EASY');
      setLessonId('');
      setExplanation('');
    }
    setClientError(null);
  }, [initialQuestion, isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const nextKey = OPTION_KEYS[options.length];
    setOptions([...options, { key: nextKey, text: '' }]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) return;
    const remaining = options.filter((_, i) => i !== indexToRemove);
    const reindexed = remaining.map((opt, i) => ({ key: OPTION_KEYS[i], text: opt.text }));
    setOptions(reindexed);

    // Adjust selected single answer if removed or out of bounds
    const validKeys = new Set(reindexed.map((o) => o.key));
    if (!validKeys.has(singleCorrectAnswer)) {
      setSingleCorrectAnswer(reindexed[0].key);
    }
    // Adjust multiple answers
    const validMultiple = multipleCorrectAnswers.filter((k) => validKeys.has(k));
    setMultipleCorrectAnswers(
      validMultiple.length >= 2 ? validMultiple : [reindexed[0].key, reindexed[1].key],
    );
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const toggleMultipleAnswer = (key: string) => {
    if (multipleCorrectAnswers.includes(key)) {
      setMultipleCorrectAnswers(multipleCorrectAnswers.filter((k) => k !== key));
    } else {
      setMultipleCorrectAnswers([...multipleCorrectAnswers, key].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const trimmedText = questionText.trim();
    if (trimmedText.length < 3 || trimmedText.length > 1000) {
      setClientError('Question text must be between 3 and 1000 characters.');
      return;
    }

    if (marks < 1 || marks > 100 || !Number.isInteger(Number(marks))) {
      setClientError('Marks must be a whole integer between 1 and 100.');
      return;
    }

    if (explanation.trim().length > 1000) {
      setClientError('Explanation cannot exceed 1000 characters.');
      return;
    }

    let payload: CreateQuestionPayload;

    if (type === 'TRUE_FALSE') {
      payload = {
        questionText: trimmedText,
        type: 'TRUE_FALSE',
        correctAnswer: trueFalseAnswer,
        marks: Number(marks),
        difficulty,
        lessonId: lessonId ? lessonId : null,
        explanation: explanation.trim() || undefined,
      };
    } else {
      if (options.length < 2) {
        setClientError('At least 2 options are required.');
        return;
      }
      for (let i = 0; i < options.length; i++) {
        if (!options[i].text.trim()) {
          setClientError(`Option ${options[i].key} cannot be empty.`);
          return;
        }
      }

      if (type === 'MCQ_SINGLE') {
        if (!singleCorrectAnswer) {
          setClientError('Select the correct answer.');
          return;
        }
        payload = {
          questionText: trimmedText,
          type: 'MCQ_SINGLE',
          options: options.map((opt) => ({ key: opt.key, text: opt.text.trim() })),
          correctAnswer: singleCorrectAnswer,
          marks: Number(marks),
          difficulty,
          lessonId: lessonId ? lessonId : null,
          explanation: explanation.trim() || undefined,
        };
      } else {
        if (multipleCorrectAnswers.length < 2) {
          setClientError('Select at least 2 correct answers for MCQ Multiple questions.');
          return;
        }
        payload = {
          questionText: trimmedText,
          type: 'MCQ_MULTIPLE',
          options: options.map((opt) => ({ key: opt.key, text: opt.text.trim() })),
          correctAnswer: multipleCorrectAnswers,
          marks: Number(marks),
          difficulty,
          lessonId: lessonId ? lessonId : null,
          explanation: explanation.trim() || undefined,
        };
      }
    }

    await onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-signal">
              {isEditing ? 'Update Question' : 'New Question'}
            </p>
            <h2 id="question-modal-title" className="font-serif text-lg font-semibold text-text-primary">
              {isEditing ? 'Edit Question Definition' : 'Add Question to Bank'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary ${interactive}`}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {clientError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{clientError}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1.5">
            <label htmlFor="question-text" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Question Text <span className="text-error">*</span>
            </label>
            <textarea
              id="question-text"
              rows={3}
              required
              minLength={3}
              maxLength={1000}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What is the time complexity of binary search?"
              className={fieldClass}
            />
            <div className="flex justify-between text-[11px] text-text-tertiary">
              <span>3–1000 characters</span>
              <span>{questionText.length}/1000</span>
            </div>
          </div>

          {/* Type, Marks, Difficulty */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="question-type" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Type <span className="text-error">*</span>
              </label>
              <select
                id="question-type"
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className={fieldClass}
              >
                <option value="MCQ_SINGLE">MCQ (Single Answer)</option>
                <option value="MCQ_MULTIPLE">MCQ (Multiple Answers)</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="question-difficulty" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Difficulty <span className="text-error">*</span>
              </label>
              <select
                id="question-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className={fieldClass}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="question-marks" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Marks <span className="text-error">*</span>
              </label>
              <input
                id="question-marks"
                type="number"
                min={1}
                max={100}
                required
                value={marks}
                onChange={(e) => setMarks(parseInt(e.target.value, 10) || 1)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Lesson Association */}
          <div className="space-y-1.5">
            <label htmlFor="question-lesson" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Associated Lesson <span className="font-normal normal-case text-text-tertiary">(optional)</span>
            </label>
            <select
              id="question-lesson"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className={fieldClass}
            >
              <option value="">None (General Topic Question)</option>
              {lessons.map((lesson) => (
                <option key={lesson._id} value={lesson._id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>

          {/* Options & Correct Answer Area */}
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            {type === 'TRUE_FALSE' ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Correct Answer <span className="text-error">*</span>
                </p>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-signal">
                    <input
                      type="radio"
                      name="true-false-answer"
                      value="TRUE"
                      checked={trueFalseAnswer === 'TRUE'}
                      onChange={() => setTrueFalseAnswer('TRUE')}
                      className="text-signal focus:ring-focus"
                    />
                    <span>True</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-signal">
                    <input
                      type="radio"
                      name="true-false-answer"
                      value="FALSE"
                      checked={trueFalseAnswer === 'FALSE'}
                      onChange={() => setTrueFalseAnswer('FALSE')}
                      className="text-signal focus:ring-focus"
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Answer Options ({options.length}/6)
                    <span className="ml-2 font-normal normal-case text-text-tertiary">
                      {type === 'MCQ_SINGLE' ? 'Select 1 correct option' : 'Select at least 2 correct options'}
                    </span>
                  </p>
                  {options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className={`inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline ${interactive}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, index) => {
                    const isCorrect =
                      type === 'MCQ_SINGLE'
                        ? singleCorrectAnswer === opt.key
                        : multipleCorrectAnswers.includes(opt.key);

                    return (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                          isCorrect ? 'border-signal/40 bg-signal-soft/30' : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex shrink-0 items-center pl-1">
                          {type === 'MCQ_SINGLE' ? (
                            <input
                              type="radio"
                              name="mcq-single-correct"
                              value={opt.key}
                              checked={singleCorrectAnswer === opt.key}
                              onChange={() => setSingleCorrectAnswer(opt.key)}
                              aria-label={`Mark option ${opt.key} as correct`}
                              className="h-4 w-4 text-signal focus:ring-focus"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={multipleCorrectAnswers.includes(opt.key)}
                              onChange={() => toggleMultipleAnswer(opt.key)}
                              aria-label={`Mark option ${opt.key} as correct`}
                              className="h-4 w-4 rounded-xs text-signal focus:ring-focus"
                            />
                          )}
                        </div>

                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-disabled text-xs font-bold text-text-primary">
                          {opt.key}
                        </span>

                        <input
                          type="text"
                          required
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(index, e.target.value)}
                          placeholder={`Option ${opt.key} text`}
                          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                        />

                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="p-1 text-text-tertiary hover:text-error"
                            title={`Remove option ${opt.key}`}
                            aria-label={`Remove option ${opt.key}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label htmlFor="question-explanation" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Explanation <span className="font-normal normal-case text-text-tertiary">(shown during review / practice)</span>
            </label>
            <textarea
              id="question-explanation"
              rows={2}
              maxLength={1000}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the answer is correct..."
              className={fieldClass}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse justify-end gap-2.5 border-t border-border pt-4 sm:flex-row">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className={interactive}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className={interactive}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {isEditing ? 'Save Changes' : 'Create Question'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
