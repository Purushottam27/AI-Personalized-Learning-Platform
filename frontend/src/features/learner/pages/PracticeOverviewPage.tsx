import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  History,
  LayoutDashboard,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { usePracticeOverview } from '../hooks/usePracticeOverview';

export const PracticeOverviewPage: React.FC = () => {
  const { practiceId } = useParams<{ practiceId: string }>();
  const navigate = useNavigate();

  const {
    practice,
    history,
    activeAttempt,
    isLoading,
    isStarting,
    error,
    errorCode,
    handleStartAttempt,
  } = usePracticeOverview(practiceId);

  const onStart = async () => {
    const attempt = await handleStartAttempt();
    if (attempt) {
      navigate(`/learner/practice-attempts/${attempt._id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-signal animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Loading practice details...</p>
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
            You must be actively enrolled in this course to access practice activities.
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

  // Handle Practice Not Found / Course Not Available
  if (error && !practice) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-error-soft border border-error/20 text-error">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Practice Not Available
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

  if (!practice) return null;

  const pastAttempts = history?.attempts ?? [];
  const completedAttempts = pastAttempts.filter((a) => a.status === 'SUBMITTED');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Back button */}
      <div>
        <Link
          to="/learner/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="rounded-3xl border border-border bg-surface p-6 md:p-10 shadow-xl space-y-6 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div
          className="absolute top-0 right-0 w-80 h-80 bg-signal/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"
          aria-hidden="true"
        />

        <div className="space-y-3 z-10 relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-signal-soft border border-signal/20 px-3 py-1 text-xs font-bold text-signal flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5" /> {practice.questionCount} {practice.questionCount === 1 ? 'Question' : 'Questions'}
            </span>

            {practice.contributeToLearningEvidence ? (
              <span className="rounded-full bg-sage-soft border border-sage/20 px-3 py-1 text-xs font-semibold text-sage flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Contributes to Evidence
              </span>
            ) : (
              <span className="rounded-full bg-surface-elevated border border-border px-3 py-1 text-xs text-text-tertiary">
                Formative Practice
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl md:text-4xl font-bold text-text-primary leading-tight">
            {practice.title}
          </h1>

          {practice.description && (
            <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-2xl">
              {practice.description}
            </p>
          )}
        </div>

        {/* Error notification if any during attempt start */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-error/25 bg-error-soft p-4 text-xs text-error flex items-start gap-2.5 z-10 relative"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="break-words">{error}</p>
          </div>
        )}

        {/* Action Panel: Resume active attempt or Start new attempt */}
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
          {activeAttempt ? (
            <>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Attempt in progress
                </p>
                <p className="text-xs text-text-secondary">
                  Attempt #{activeAttempt.attemptNumber} was started on{' '}
                  {new Date(activeAttempt.startedAt).toLocaleDateString()}.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => navigate(`/learner/practice-attempts/${activeAttempt._id}`)}
                className="cursor-pointer bg-signal hover:bg-signal-hover text-white font-semibold px-6 py-3"
              >
                <RotateCcw className="h-4 w-4" /> Resume Attempt
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-text-tertiary">
                  {completedAttempts.length > 0
                    ? `You have completed ${completedAttempts.length} ${completedAttempts.length === 1 ? 'attempt' : 'attempts'}.`
                    : 'Start your first attempt to practice and receive instant formative feedback.'}
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                loading={isStarting}
                disabled={isStarting}
                onClick={onStart}
                className="cursor-pointer bg-signal hover:bg-signal-hover text-white font-semibold px-6 py-3"
              >
                <Play className="h-4 w-4" />
                {completedAttempts.length > 0 ? 'Start New Attempt' : 'Start Practice'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Attempt History Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-text-secondary" />
          <h2 className="font-serif text-xl font-bold text-text-primary">Attempt History</h2>
        </div>

        {pastAttempts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-text-tertiary">
            No previous attempts recorded yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border/60">
            {pastAttempts.map((att) => {
              const isComp = att.status === 'SUBMITTED';
              const dateStr = new Date(att.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={att._id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-elevated/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                        isComp
                          ? 'border-sage/30 bg-sage-soft text-sage'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isComp ? <Award className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          Attempt #{att.attemptNumber}
                        </span>
                        {isComp ? (
                          <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-bold text-sage">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            In Progress
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dateStr}
                        </span>
                        {isComp && (
                          <>
                            <span>·</span>
                            <span>{att.correctCount} of {att.totalQuestions} correct</span>
                            <span>·</span>
                            <span>{att.marksAwarded} / {att.totalMarks} marks</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {isComp && att.scorePercent !== null && (
                      <span className="font-serif text-lg font-bold text-text-primary mr-2">
                        {att.scorePercent}%
                      </span>
                    )}

                    <Link to={`/learner/practice-attempts/${att._id}`}>
                      <Button
                        type="button"
                        variant="secondary"
                        className="cursor-pointer text-xs px-3 py-1.5"
                      >
                        {isComp ? 'Review' : 'Resume'}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
