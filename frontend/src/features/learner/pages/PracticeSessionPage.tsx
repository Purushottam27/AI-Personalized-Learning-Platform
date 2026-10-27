import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { PracticeConfirmSubmitModal } from '../components/PracticeSession/PracticeConfirmSubmitModal';
import { PracticeProgressHeader } from '../components/PracticeSession/PracticeProgressHeader';
import { PracticeQuestionCard } from '../components/PracticeSession/PracticeQuestionCard';
import { PracticeResultsCard } from '../components/PracticeSession/PracticeResultsCard';

export const PracticeSessionPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const questionsSectionRef = useRef<HTMLDivElement>(null);

  const {
    attempt,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    unansweredCount,
    isLoading,
    isSavingAnswer,
    isSubmitting,
    error,
    errorCode,
    isSubmitted,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    handleSaveAnswer,
    handleSubmit,
  } = usePracticeSession(attemptId);

  const onConfirmSubmit = async () => {
    const success = await handleSubmit();
    if (success) {
      setIsSubmitModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToQuestions = () => {
    if (questionsSectionRef.current) {
      questionsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-signal animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Loading practice attempt...</p>
      </div>
    );
  }

  // Handle Enrollment Required error specifically
  if (errorCode === 'ACTIVE_ENROLLMENT_REQUIRED') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <BookOpen className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Active Enrollment Required
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            You must be actively enrolled in this course to view or continue this practice attempt.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/learner/dashboard">
            <Button variant="secondary" className="cursor-pointer">
              <LayoutDashboard className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle Attempt Not Found or Course Not Available
  if (error && !attempt) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-error-soft border border-error/20 text-error">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Attempt Not Found
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <Link to="/learner/dashboard">
            <Button variant="secondary" className="cursor-pointer">
              <LayoutDashboard className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <p className="text-sm text-text-tertiary">No questions available in this attempt.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* If submitted, show full results summary card at top */}
      {isSubmitted && (
        <PracticeResultsCard
          attempt={attempt}
          onScrollToQuestions={scrollToQuestions}
        />
      )}

      {/* Progress header & Question Navigator */}
      <PracticeProgressHeader
        practiceId={attempt.practiceId}
        attemptNumber={attempt.attemptNumber}
        isSubmitted={isSubmitted}
        contributeToLearningEvidence={attempt.contributeToLearningEvidence}
        questions={attempt.questions}
        currentIndex={currentQuestionIndex}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onSelectIndex={goToQuestion}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        isSavingAnswer={isSavingAnswer}
      />

      {/* Inline banner for transient errors (e.g. concurrent update) */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/25 bg-error-soft p-4 text-xs text-error flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="break-words">{error}</p>
        </div>
      )}

      {/* Active Question Card */}
      <div ref={questionsSectionRef}>
        <PracticeQuestionCard
          key={currentQuestion.questionId}
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          isSaving={isSavingAnswer}
          isSubmitted={isSubmitted}
          onSaveAnswer={handleSaveAnswer}
          onPrev={prevQuestion}
          onNext={nextQuestion}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          hasPrev={currentQuestionIndex > 0}
          hasNext={currentQuestionIndex < totalQuestions - 1}
        />
      </div>

      {/* Confirmation modal before final submit */}
      <PracticeConfirmSubmitModal
        isOpen={isSubmitModalOpen}
        unansweredCount={unansweredCount}
        totalQuestions={totalQuestions}
        isSubmitting={isSubmitting}
        errorMessage={error}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={onConfirmSubmit}
      />
    </div>
  );
};
