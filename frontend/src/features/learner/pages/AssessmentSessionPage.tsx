import React, { useState, useEffect, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAssessmentAttempt,
  saveAssessmentAnswer,
  submitAssessmentAttempt,
} from '../api/assessmentAttempt.api';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { AssessmentAttempt, AssessmentAttemptQuestion } from '../types/assessmentAttempt.types';

export const AssessmentSessionPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const optionIdPrefix = useId();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  // Fetch Attempt
  useEffect(() => {
    async function loadAttempt() {
      if (!attemptId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getAssessmentAttempt(attemptId);
        setAttempt(data);

        // Prepopulate answers from attempt questions
        const initialAnswers: Record<string, any> = {};
        data.questions.forEach((q) => {
          if (q.answer !== undefined && q.answer !== null) {
            initialAnswers[q.questionId] = q.answer;
          }
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load assessment attempt');
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  const handleSubmit = async () => {
    if (!attemptId) return;
    try {
      setSubmitting(true);
      const finalized = await submitAssessmentAttempt(attemptId, 'MANUAL');
      setAttempt(finalized);
      setIsSubmitModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!attempt || attempt.status === 'SUBMITTED' || !attempt.deadlineAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(attempt.deadlineAt!).getTime();
      const diffSeconds = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeftSeconds(diffSeconds);

      if (diffSeconds <= 0) {
        clearInterval(interval);
        // Auto-submit on time limit
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt]);

  // Save answer handler
  const handleAnswerSelect = async (questionId: string, answerValue: any) => {
    if (attempt?.status === 'SUBMITTED') return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerValue,
    }));

    try {
      await saveAssessmentAnswer(attemptId!, questionId, answerValue);
    } catch (err) {
      console.error('Failed to auto-save answer', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
        <p className="text-sm text-text-secondary">Preparing assessment session...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-surface-elevated border border-border text-center mt-8">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Assessment Error</h2>
        <p className="text-sm text-text-secondary mb-6">{error || 'Unable to load attempt.'}</p>
        <button
          onClick={() => navigate('/learner/courses')}
          className="px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const isSubmitted = attempt.status === 'SUBMITTED';
  const currentQuestion: AssessmentAttemptQuestion | undefined = attempt.questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== null && answers[k] !== undefined
  ).length;
  const unansweredCount = attempt.questions.length - answeredCount;

  // Format Timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      {/* Top Banner & Timer Bar */}
      <div className="p-4 rounded-2xl bg-surface-elevated border border-border flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-signal uppercase tracking-wider block">
            {attempt.assessmentType} Assessment • Attempt #{attempt.attemptNumber}
          </span>
          <span className="text-xs text-text-secondary">
            Question {currentIndex + 1} of {attempt.questions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isSubmitted && timeLeftSeconds !== null && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
                timeLeftSeconds < 120
                  ? 'bg-error-soft text-error border-error/20 animate-pulse'
                  : 'bg-surface text-text-primary border-border'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          {!isSubmitted && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 shadow-sm transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment</span>
            </button>
          )}

          {isSubmitted && (
            <button
              onClick={() => navigate(`/learner/courses/${attempt.courseId}`)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface transition-colors"
            >
              Course Overview
            </button>
          )}
        </div>
      </div>

      {/* Submitted Score Summary Banner */}
      {isSubmitted && (
        <div
          className={`p-6 rounded-3xl border ${
            attempt.passed
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
              : 'bg-error-soft border-error/20 text-text-primary'
          } space-y-4 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {attempt.passed ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-error/20 flex items-center justify-center text-error">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-extrabold text-text-primary">
                  {attempt.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Required passing score: <strong>{attempt.passingScore}%</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-3xl font-black text-text-primary">
                {attempt.scorePercent}%
              </span>
              <span className="block text-xs text-text-secondary font-medium">
                {attempt.marksAwarded} / {attempt.totalMarks} Marks
              </span>
            </div>
          </div>

          {attempt.assessmentType === 'DIAGNOSTIC' && attempt.passed && (
            <div className="p-3.5 rounded-xl bg-surface/80 border border-border text-xs text-text-secondary flex items-center justify-between gap-3">
              <span>
                Diagnostic requirement satisfied! You are now eligible to enroll in this course.
              </span>
              <button
                onClick={() => navigate(`/learner/courses/${attempt.courseId}`)}
                className="px-3.5 py-1.5 rounded-lg bg-signal text-white font-semibold hover:opacity-90 shrink-0"
              >
                Enroll Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Question Navigator Pills */}
      <div className="p-3 rounded-2xl bg-surface-elevated border border-border flex items-center gap-2 overflow-x-auto">
        {attempt.questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const hasAnswer = answers[q.questionId] !== null && answers[q.questionId] !== undefined;

          let badgeColor = isSelected
            ? 'bg-signal text-white font-bold ring-2 ring-signal/30'
            : hasAnswer
            ? 'bg-surface border-border text-text-primary font-semibold'
            : 'bg-surface/50 border-border/60 text-text-tertiary';

          if (isSubmitted) {
            badgeColor = q.isCorrect
              ? isSelected
                ? 'bg-emerald-500 text-white font-bold ring-2 ring-emerald-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
              : isSelected
              ? 'bg-error text-white font-bold ring-2 ring-error/30'
              : 'bg-error-soft border-error/30 text-error font-semibold';
          }

          return (
            <button
              key={q.questionId}
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-xl border text-xs flex items-center justify-center shrink-0 transition-all ${badgeColor}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Active Question Card */}
      {currentQuestion && (
        <div className="p-8 rounded-3xl bg-surface-elevated border border-border space-y-6 shadow-sm">
          {/* Question Header */}
          <div className="flex items-center justify-between text-xs text-text-tertiary border-b border-border pb-3">
            <span className="font-bold uppercase tracking-wider text-signal">
              Question {currentIndex + 1} • {currentQuestion.type.replace('_', ' ')}
            </span>
            <span className="font-semibold">{currentQuestion.marks} Marks</span>
          </div>

          {/* Question Text */}
          <h3 className="text-lg font-bold text-text-primary leading-relaxed">
            {currentQuestion.questionText}
          </h3>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {currentQuestion.type === 'TRUE_FALSE' ? (
              <div className="grid grid-cols-2 gap-4">
                {['TRUE', 'FALSE'].map((optKey) => {
                  const isChecked = answers[currentQuestion.questionId] === optKey;
                  const optId = `${optionIdPrefix}-q-${currentQuestion.questionId}-${optKey}`;

                  return (
                    <label
                      key={optKey}
                      htmlFor={optId}
                      className={`p-4 rounded-2xl border text-sm font-semibold cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-signal/10 border-signal text-signal'
                          : 'bg-surface border-border text-text-secondary hover:border-text-tertiary'
                      } ${isSubmitted ? 'cursor-default' : ''}`}
                    >
                      <span>{optKey === 'TRUE' ? 'True' : 'False'}</span>
                      <input
                        id={optId}
                        type="radio"
                        name={`q-${currentQuestion.questionId}`}
                        disabled={isSubmitted}
                        checked={isChecked}
                        onChange={() => handleAnswerSelect(currentQuestion.questionId, optKey)}
                        className="text-signal focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            ) : currentQuestion.type === 'MCQ_SINGLE' ? (
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => {
                  const isChecked = answers[currentQuestion.questionId] === opt.key;
                  const optId = `${optionIdPrefix}-q-${currentQuestion.questionId}-${opt.key}`;

                  return (
                    <label
                      key={opt.key}
                      htmlFor={optId}
                      className={`p-4 rounded-2xl border text-sm cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isChecked
                          ? 'bg-signal/10 border-signal text-text-primary font-semibold'
                          : 'bg-surface border-border text-text-secondary hover:border-text-tertiary'
                      } ${isSubmitted ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold shrink-0">
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      <input
                        id={optId}
                        type="radio"
                        name={`q-${currentQuestion.questionId}`}
                        disabled={isSubmitted}
                        checked={isChecked}
                        onChange={() => handleAnswerSelect(currentQuestion.questionId, opt.key)}
                        className="text-signal focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              // MCQ_MULTIPLE
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => {
                  const currentSelected: string[] = Array.isArray(answers[currentQuestion.questionId])
                    ? answers[currentQuestion.questionId]
                    : [];
                  const isChecked = currentSelected.includes(opt.key);
                  const optId = `${optionIdPrefix}-q-${currentQuestion.questionId}-${opt.key}`;

                  const toggleMultiple = () => {
                    if (isSubmitted) return;
                    const updated = isChecked
                      ? currentSelected.filter((k) => k !== opt.key)
                      : [...currentSelected, opt.key];
                    handleAnswerSelect(currentQuestion.questionId, updated);
                  };

                  return (
                    <label
                      key={opt.key}
                      htmlFor={optId}
                      className={`p-4 rounded-2xl border text-sm cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isChecked
                          ? 'bg-signal/10 border-signal text-text-primary font-semibold'
                          : 'bg-surface border-border text-text-secondary hover:border-text-tertiary'
                      } ${isSubmitted ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold shrink-0">
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      <input
                        id={optId}
                        type="checkbox"
                        disabled={isSubmitted}
                        checked={isChecked}
                        onChange={toggleMultiple}
                        className="rounded text-signal focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results Reveal Explanation */}
          {isSubmitted && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold">
                {currentQuestion.isCorrect ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Correct Answer
                  </span>
                ) : (
                  <span className="text-error flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Incorrect
                  </span>
                )}
                <span className="text-text-tertiary font-mono">
                  Correct:{' '}
                  {Array.isArray(currentQuestion.correctAnswer)
                    ? currentQuestion.correctAnswer.join(', ')
                    : String(currentQuestion.correctAnswer)}
                </span>
              </div>
              {currentQuestion.explanation && (
                <p className="text-text-secondary leading-relaxed">{currentQuestion.explanation}</p>
              )}
            </div>
          )}

          {/* Prev / Next Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="py-2 px-4 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              disabled={currentIndex >= attempt.questions.length - 1}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="py-2 px-4 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <span>Next Question</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Submitting */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-elevated border border-border rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-signal/10 flex items-center justify-center text-signal">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Ready to Submit?</h3>
                <p className="text-xs text-text-secondary">Please confirm your final submission.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Answered Questions:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}</strong>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Unanswered Questions:</span>
                <strong className={unansweredCount > 0 ? 'text-amber-500' : 'text-text-tertiary'}>
                  {unansweredCount}
                </strong>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-text-tertiary">
                Note: Unanswered questions will receive 0 marks and count as learning evidence for targeted review.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
              >
                Continue Assessment
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
