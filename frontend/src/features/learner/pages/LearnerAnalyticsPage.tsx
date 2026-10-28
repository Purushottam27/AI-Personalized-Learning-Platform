import React from 'react';
import { useLearnerAnalytics } from '../hooks/useLearnerAnalytics';
import {
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  AlertCircle,
  RefreshCw,
  Loader2,
  BarChart2,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LearnerAnalyticsPage: React.FC = () => {
  const { data, isLoading, error, days, setDays, refetch } = useLearnerAnalytics(7);

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-4" />
        <p className="text-sm text-text-secondary font-medium">Loading your analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-error-soft flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load analytics</h2>
        <p className="text-text-secondary mb-6 text-center max-w-md">{error}</p>
        <button
          onClick={refetch}
          className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-6 py-3 text-sm rounded-xl border border-border hover:bg-surface-elevated text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { activityTotals, masteryDistribution, dailyTrends, courseProgressList } = data;
  const hasActivity =
    activityTotals.totalPracticesCompleted > 0 ||
    activityTotals.totalAssessmentsCompleted > 0;

  return (
    <div className="max-w-6xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            Learning Progress & Analytics
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">
            Evidence-backed analytics tracking your practice activity, topic mastery, and course progress.
          </p>
        </div>

        {/* Date Window Toggle */}
        <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              days === 7
                ? 'bg-signal text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDays(14)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              days === 14
                ? 'bg-signal text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            14 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              days === 30
                ? 'bg-signal text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Practices</span>
            <BookOpen className="w-4 h-4 text-signal" />
          </div>
          <div className="text-3xl font-display font-semibold text-text-primary">
            {activityTotals.totalPracticesCompleted}
          </div>
          <p className="text-xs text-text-secondary mt-1">Completed practice sessions</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Assessments</span>
            <Award className="w-4 h-4 text-sage" />
          </div>
          <div className="text-3xl font-display font-semibold text-text-primary">
            {activityTotals.totalAssessmentsCompleted}
          </div>
          <p className="text-xs text-text-secondary mt-1">Evaluated assessment attempts</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Accuracy</span>
            <TrendingUp className="w-4 h-4 text-signal" />
          </div>
          <div className="text-3xl font-display font-semibold text-text-primary">
            {activityTotals.overallAccuracy}%
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {activityTotals.totalQuestionsCorrect} / {activityTotals.totalQuestionsAttempted} correct questions
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Courses</span>
            <BarChart2 className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="text-3xl font-display font-semibold text-text-primary">
            {activityTotals.activeCoursesCount}
          </div>
          <p className="text-xs text-text-secondary mt-1">Active course enrollments</p>
        </div>
      </div>

      {/* Empty State when learner has no activity yet */}
      {!hasActivity && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4 border border-border">
            <HelpCircle className="w-6 h-6 text-signal" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No learning activity recorded yet</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Complete practice sessions or take assessments in your enrolled courses to generate evidence and unlock detailed mastery analytics.
          </p>
          <Link
            to="/learner/dashboard"
            className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 px-5 py-2.5 text-sm rounded-xl bg-signal text-text-inverse hover:bg-signal/90"
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {/* Mastery Distribution Section */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Topic Mastery Distribution</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Breakdown of curriculum topics based on your verified learning evidence. Mastery evaluates accuracy, attempt depth, and confidence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sage-soft text-sage mb-2">
              MASTERED
            </span>
            <div className="text-2xl font-bold text-text-primary">{masteryDistribution.MASTERED}</div>
            <p className="text-[11px] text-text-tertiary mt-1">Score ≥ 90%, High Confidence</p>
          </div>

          <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-signal-soft text-signal mb-2">
              STRONG
            </span>
            <div className="text-2xl font-bold text-text-primary">{masteryDistribution.STRONG}</div>
            <p className="text-[11px] text-text-tertiary mt-1">Score 75% – 89.9%</p>
          </div>

          <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-surface-disabled text-text-secondary mb-2">
              FUNCTIONAL
            </span>
            <div className="text-2xl font-bold text-text-primary">{masteryDistribution.FUNCTIONAL}</div>
            <p className="text-[11px] text-text-tertiary mt-1">Score 60% – 74.9%</p>
          </div>

          <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 mb-2">
              DEVELOPING
            </span>
            <div className="text-2xl font-bold text-text-primary">{masteryDistribution.DEVELOPING}</div>
            <p className="text-[11px] text-text-tertiary mt-1">Score 40% – 59.9%</p>
          </div>

          <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-error-soft text-error mb-2">
              NEEDS ATTENTION
            </span>
            <div className="text-2xl font-bold text-text-primary">{masteryDistribution.NEEDS_IMPROVEMENT}</div>
            <p className="text-[11px] text-text-tertiary mt-1">Score &lt; 40%, Weak Topic</p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-surface-elevated border border-border-muted text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary font-semibold">Evidence Model Note:</strong> Topics without sufficient practice or assessment attempts lack evidentiary weight and remain unclassified until evaluated. Low mastery reflects areas needing further practice, not permanent performance.
        </div>
      </div>

      {/* Actionable Learning Insights */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-signal" />
          <h2 className="text-lg font-semibold text-text-primary">Actionable Learning Insights</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {masteryDistribution.NEEDS_IMPROVEMENT > 0 ? (
            <div className="p-4 rounded-xl border border-signal/20 bg-signal-soft/30 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-signal block">Targeted Intervention</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                You have <strong className="text-text-primary font-semibold">{masteryDistribution.NEEDS_IMPROVEMENT}</strong> topic(s) categorized as Needs Attention. Reviewing the corresponding lesson concepts and completing targeted practice will build your foundational mastery.
              </p>
              <Link
                to="/learner/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal hover:underline pt-1"
              >
                Go to Dashboard Next Actions →
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sage block">Strong Foundations</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                No topics currently require urgent remediation. Continue progressing through your active lessons or challenge yourself with topic assessments.
              </p>
              <Link
                to="/learner/explore"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary hover:text-signal hover:underline pt-1"
              >
                Explore More Courses →
              </Link>
            </div>
          )}

          {activityTotals.overallAccuracy >= 75 && activityTotals.totalPracticesCompleted >= 2 ? (
            <div className="p-4 rounded-xl border border-sage/25 bg-sage-soft/30 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sage block">Ready for Assessment</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                Your overall accuracy is high (<strong className="text-text-primary font-semibold">{activityTotals.overallAccuracy}%</strong>). Your practice performance indicates readiness to attempt formal assessments in your mastered topics.
              </p>
              <Link
                to="/learner/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage hover:underline pt-1"
              >
                View Eligible Assessments →
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border-muted bg-surface-elevated space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary block">Consistent Practice</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                Consistent practice sessions increase evidence confidence. Each question completed contributes directly to your mastery calculation.
              </p>
              <Link
                to="/learner/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary hover:text-signal hover:underline pt-1"
              >
                Resume Learning →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity Trends */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Activity & Accuracy Trends</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Daily practice completions, assessment attempts, and accuracy across the last {days} days.
            </p>
          </div>
          <Calendar className="w-5 h-5 text-text-tertiary" />
        </div>

        {/* Learning Consistency Overview */}
        <div className="mb-6 p-4 rounded-xl border border-border-muted bg-surface-elevated flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-signal/10 border border-signal/20 text-signal shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary block">
                Learning Consistency
              </span>
              <p className="text-sm font-semibold text-text-primary mt-0.5">
                Active on {dailyTrends.filter((t) => t.practiceCount > 0 || t.assessmentCount > 0).length} of the last {days} days
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary max-w-sm">
            {dailyTrends.filter((t) => t.practiceCount > 0 || t.assessmentCount > 0).length >= Math.ceil(days / 2)
              ? 'Excellent learning momentum! Consistent study intervals significantly enhance long-term knowledge retention.'
              : dailyTrends.filter((t) => t.practiceCount > 0 || t.assessmentCount > 0).length > 0
              ? 'Steady progress. Daily short study intervals help reinforce developing topic concepts.'
              : 'No sessions logged in this period. Setting aside 15 minutes a day builds consistent mastery evidence.'}
          </p>
        </div>

        <div className="space-y-3">
          {dailyTrends.map((trend) => {
            const hasDayActivity = trend.practiceCount > 0 || trend.assessmentCount > 0;
            return (
              <div
                key={trend.date}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border-muted bg-surface-elevated gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono font-medium text-text-secondary min-w-[90px]">
                    {trend.date}
                  </div>
                  <div className="flex items-center gap-2">
                    {trend.practiceCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                        {trend.practiceCount} {trend.practiceCount === 1 ? 'practice' : 'practices'}
                      </span>
                    )}
                    {trend.assessmentCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-sage font-medium">
                        {trend.assessmentCount} {trend.assessmentCount === 1 ? 'assessment' : 'assessments'}
                      </span>
                    )}
                    {!hasDayActivity && (
                      <span className="text-xs text-text-tertiary italic">No activity</span>
                    )}
                  </div>
                </div>

                {hasDayActivity && (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-secondary">
                      <strong className="text-text-primary">{trend.totalQuestions}</strong> questions
                    </span>
                    <span className="text-text-secondary">
                      Accuracy: <strong className="text-signal">{trend.accuracyPercent}%</strong>
                    </span>
                    {trend.averageScore > 0 && (
                      <span className="text-text-secondary">
                        Avg Score: <strong className="text-sage">{trend.averageScore}%</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Enrolled Courses Progress */}
      {courseProgressList && courseProgressList.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-text-primary">Enrolled Course Progress</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Topic mastery progression across all your active course enrollments.
            </p>
          </div>

          <div className="space-y-4">
            {courseProgressList.map((course) => (
              <div
                key={course.courseId}
                className="p-4 rounded-xl border border-border-muted bg-surface-elevated space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{course.courseTitle}</h3>
                    {course.domain && (
                      <span className="text-xs text-text-tertiary">{course.domain}</span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    <strong className="text-text-primary">{course.masteredTopics}</strong> / {course.totalTopics} topics mastered
                    ({course.progressPercentage}%)
                  </div>
                </div>

                <div className="h-2.5 w-full bg-surface-disabled rounded-full overflow-hidden">
                  <div
                    className="h-full bg-signal transition-all duration-500 ease-out"
                    style={{ width: `${course.progressPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
