import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Target,
  BookOpen,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Compass,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useLearnerRecommendations } from '../hooks/useLearnerRecommendations';
import type {
  LearnerRecommendationItem,
  LearnerNextBestAction,
  RecommendationTier,
} from '../types/recommendation.types';

export const LearnerRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    recommendations,
    rawRecommendations,
    courseRecommendations,
    nextBestAction,
    totalCount,
    isLoading,
    isLoadingCourses,
    error,
    refetch,
    selectedCourseId,
    setSelectedCourseId,
    selectedTier,
    setSelectedTier,
    enrolledCourses,
  } = useLearnerRecommendations();

  // Helper to resolve route destination
  const handleNavigateToAction = (item: LearnerRecommendationItem | LearnerNextBestAction) => {
    if (item.targetType === 'COURSE' || item.actionType === 'EXPLORE_COURSE') {
      navigate(`/learner/courses/${item.courseId || item.targetId}`);
      return;
    }

    if (!item.isActionable) {
      if (item.courseId) {
        navigate(`/learner/courses/${item.courseId}`);
      } else {
        navigate('/learner/courses');
      }
      return;
    }

    if (item.targetType === 'PRACTICE') {
      navigate(`/learner/practices/${item.targetId}`);
      return;
    }

    if (item.targetType === 'LESSON') {
      navigate(`/learner/courses/${item.courseId}/learn`);
      return;
    }

    if (item.targetType === 'TOPIC') {
      navigate(`/learner/courses/${item.courseId}/learn`);
      return;
    }

    // Default fallback
    if (item.courseId) {
      navigate(`/learner/courses/${item.courseId}`);
    } else {
      navigate('/learner/courses');
    }
  };

  // Tier Badge presentation
  const getTierBadge = (tier: RecommendationTier) => {
    switch (tier) {
      case 'DEMONSTRATED_WEAKNESS':
        return {
          label: 'Needs Attention',
          classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          icon: AlertCircle,
        };
      case 'DEVELOPING_MASTERY':
        return {
          label: 'Developing Mastery',
          classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: TrendingUp,
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          label: 'New Topic',
          classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: BookOpen,
        };
      case 'MASTERY_PROGRESSION':
        return {
          label: 'Ready to Advance',
          classes: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          icon: Target,
        };
      case 'MASTERED':
        return {
          label: 'Mastered Reinforcement',
          classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: CheckCircle2,
        };
      default:
        return {
          label: 'Personalized',
          classes: 'bg-surface-disabled text-text-secondary border-border',
          icon: Sparkles,
        };
    }
  };

  const getActionLabel = (item: LearnerRecommendationItem | LearnerNextBestAction) => {
    if (item.targetType === 'COURSE' || item.actionType === 'EXPLORE_COURSE') return 'Explore Course';
    if (!item.isActionable) return 'View Course';
    switch (item.targetType) {
      case 'PRACTICE':
        return 'Start Practice';
      case 'LESSON':
        return 'Study Lesson';
      case 'TOPIC':
        return 'Advance Topic';
      default:
        return 'Continue';
    }
  };

  // Loading Skeleton
  if (isLoading && rawRecommendations.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-pulse">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-surface-elevated rounded-xl"></div>
          <div className="h-4 w-96 bg-surface-elevated rounded-lg"></div>
        </div>

        {/* Filter skeleton */}
        <div className="flex gap-3">
          <div className="h-10 w-44 bg-surface-elevated rounded-xl"></div>
          <div className="h-10 w-32 bg-surface-elevated rounded-xl"></div>
          <div className="h-10 w-32 bg-surface-elevated rounded-xl"></div>
        </div>

        {/* Hero Card skeleton */}
        <div className="h-48 rounded-2xl bg-surface-elevated border border-border"></div>

        {/* Items skeleton */}
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-surface-elevated border border-border"></div>
          <div className="h-32 rounded-2xl bg-surface-elevated border border-border"></div>
          <div className="h-32 rounded-2xl bg-surface-elevated border border-border"></div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && rawRecommendations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-error-soft border border-error/20 flex items-center justify-center mx-auto mb-4 text-error">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Unable to Load Recommendations</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">{error}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-signal text-white font-medium text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // Check if learner has zero enrollments
  const hasNoEnrollments = !isLoadingCourses && enrolledCourses.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-signal uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Personalization Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            Recommended for You
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Evidence-based recommendations derived from your assessment attempts, practice
            accuracy, and mastery status across enrolled curriculum.
          </p>
        </div>

        {/* Enrolled Courses Filter Dropdown */}
        {enrolledCourses.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="course-filter" className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Course:
            </label>
            <select
              id="course-filter"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer hover:border-border-muted transition-colors"
            >
              <option value="ALL">All Enrolled Courses ({enrolledCourses.length})</option>
              {enrolledCourses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Zero Enrollments Empty State */}
      {hasNoEnrollments && (!courseRecommendations || courseRecommendations.length === 0) && (
        <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-surface border border-border text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-signal-soft/40 border border-signal/20 text-signal flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-text-primary">No Active Course Enrollments</h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Personalized recommendations are generated as you learn, practice, and complete assessments in enrolled courses.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/learner/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <BookOpen className="w-4 h-4" /> Explore Catalog
            </Link>
          </div>
        </div>
      )}

      {/* Discovery Recommendations for New Learners without Enrollments */}
      {hasNoEnrollments && courseRecommendations && courseRecommendations.length > 0 && (
        <div className="space-y-6">
          {nextBestAction && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-signal animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                  Recommended Starting Course
                </h2>
              </div>
              <div
                className="relative overflow-hidden rounded-3xl border border-signal/30 bg-gradient-to-br from-signal-soft/40 via-surface to-surface-elevated p-6 sm:p-8 shadow-sm transition-shadow duration-300 border-l-4 border-l-signal"
                style={{ boxShadow: 'var(--shadow-premium-card)' }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-signal text-white">
                      <Sparkles className="w-3.5 h-3.5" />
                      Matches Your Onboarding Profile
                    </span>
                    <h3 className="text-xl sm:text-2xl font-display font-bold text-text-primary">
                      {nextBestAction.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {nextBestAction.description}
                    </p>
                    {nextBestAction.explanation && (
                      <p className="text-xs text-text-tertiary font-medium">
                        {nextBestAction.explanation}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => handleNavigateToAction(nextBestAction)}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-signal text-white font-semibold text-sm hover:opacity-95 transition-opacity shadow-sm cursor-pointer"
                    >
                      <span>Explore Course</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Compass className="w-5 h-5 text-signal" />
              Recommended Courses for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseRecommendations.map((cr) => (
                <div
                  key={cr.id}
                  className="rounded-2xl border border-border bg-surface hover:border-signal/40 p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-signal-soft/60 px-2 py-0.5 text-[11px] font-bold text-signal">
                        {cr.domain || cr.category || 'Course'}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {cr.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-text-primary">
                      {cr.title}
                    </h3>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {cr.description}
                    </p>
                    {cr.matchedInterest && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-text-tertiary bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/60">
                        <Sparkles className="w-3 h-3 text-signal" />
                        <span>Matches interest: <strong className="text-text-primary">{cr.matchedInterest}</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-text-tertiary truncate max-w-[200px]">
                      {cr.reason}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/learner/courses/${cr.courseId}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                    >
                      Explore Course <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!hasNoEnrollments && (
        <>
          {/* Featured Hero: Next Best Action */}
          {nextBestAction && selectedTier === 'ALL' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-signal animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                  Top Recommended Priority
                </h2>
              </div>

              <div
                className="relative overflow-hidden rounded-3xl border border-signal/30 bg-gradient-to-br from-signal-soft/40 via-surface to-surface-elevated p-6 sm:p-8 shadow-sm transition-shadow duration-300 border-l-4 border-l-signal"
                style={{ boxShadow: 'var(--shadow-premium-card)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-signal text-white">
                        <Sparkles className="w-3.5 h-3.5" /> Next Best Action
                      </span>
                      {nextBestAction.status && typeof nextBestAction.score === 'number' && nextBestAction.score !== null ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface-disabled text-text-secondary border border-border">
                          Mastery: {nextBestAction.score}% ({nextBestAction.status.replace(/_/g, ' ')})
                        </span>
                      ) : nextBestAction.status ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface-disabled text-text-secondary border border-border">
                          Status: {nextBestAction.status.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-display">
                      {nextBestAction.title}
                    </h3>

                    <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                      {nextBestAction.description}
                    </p>

                    {/* AI Engine Explanation */}
                    {nextBestAction.explanation && (
                      <div className="inline-flex items-start gap-2 text-xs text-text-tertiary bg-surface/80 border border-border-muted px-3.5 py-2 rounded-xl mt-2">
                        <Info className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          <strong>Why this action:</strong> {nextBestAction.explanation}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleNavigateToAction(nextBestAction)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-signal text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer"
                    >
                      <span>{getActionLabel(nextBestAction)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tier Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-muted">
            <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mr-1">
              Category:
            </span>
            {[
              { id: 'ALL', label: `All (${rawRecommendations.length})` },
              { id: 'DEMONSTRATED_WEAKNESS', label: 'Needs Attention' },
              { id: 'DEVELOPING_MASTERY', label: 'Developing' },
              { id: 'INSUFFICIENT_EVIDENCE', label: 'New Topics' },
              { id: 'MASTERY_PROGRESSION', label: 'Ready to Advance' },
              { id: 'MASTERED', label: 'Mastered' },
            ].map((tab) => {
              const count =
                tab.id === 'ALL'
                  ? rawRecommendations.length
                  : rawRecommendations.filter((r) => r.tier === tab.id).length;

              if (tab.id !== 'ALL' && count === 0) return null;

              const isSelected = selectedTier === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTier(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-signal text-white shadow-xs'
                      : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Recommendations List / Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-tertiary">
                Learning Action Items ({recommendations.length}
                {totalCount > recommendations.length ? ` of ${totalCount}` : ''})
              </h2>
              {recommendations.length > 0 && (
                <span className="text-xs text-text-tertiary">
                  Ranked by learning urgency & curriculum sequence
                </span>
              )}
            </div>

            {recommendations.length === 0 ? (
              <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-disabled flex items-center justify-center mx-auto text-text-tertiary">
                  <CheckCircle2 className="w-6 h-6 text-signal" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-primary">
                    {selectedTier !== 'ALL'
                      ? 'No recommendations in this category'
                      : 'You are all caught up!'}
                  </h3>
                  <p className="text-xs text-text-secondary max-w-md mx-auto">
                    {selectedTier !== 'ALL'
                      ? 'No items currently match the selected filter. Try selecting "All" to view all suggestions.'
                      : 'No further targeted interventions currently needed for your enrolled courses. Continue your lessons or explore new topics!'}
                  </p>
                </div>
                {selectedTier !== 'ALL' ? (
                  <button
                    onClick={() => setSelectedTier('ALL')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal hover:underline cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : (
                  <Link
                    to="/learner/courses"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text-primary text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
                  >
                    Go to My Courses
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {recommendations.map((rec) => {
                  const badge = getTierBadge(rec.tier);
                  const BadgeIcon = badge.icon;

                  return (
                    <div
                      key={rec.id}
                      className="group rounded-2xl border border-border bg-surface hover:border-border-muted p-5 sm:p-6 transition-all duration-200 hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                    >
                      <div className="space-y-3 flex-1">
                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-text-tertiary text-[11px] bg-surface-disabled px-2 py-0.5 rounded-md">
                            #{rec.priority}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold border ${badge.classes}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>

                          <span className="text-text-tertiary">•</span>

                          <span className="text-text-secondary font-medium">
                            {rec.courseTitle}
                          </span>

                          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />

                          <span className="text-text-secondary">
                            Topic {rec.topicOrder}: {rec.topicTitle}
                          </span>
                        </div>

                        {/* Recommendation Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-text-primary group-hover:text-signal transition-colors">
                            {rec.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                            {rec.description}
                          </p>
                        </div>

                        {/* AI Explanation & Context */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {rec.explanation && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-text-tertiary bg-surface-elevated/60 px-3 py-1.5 rounded-lg border border-border-muted">
                              <Sparkles className="w-3.5 h-3.5 text-signal shrink-0" />
                              <span className="line-clamp-1">{rec.explanation}</span>
                            </div>
                          )}

                          {typeof rec.masteryScore === 'number' && rec.masteryScore !== null ? (
                            <span className="text-xs font-medium text-text-tertiary">
                              Mastery: <span className="font-semibold text-text-primary">{rec.masteryScore}%</span>
                              {typeof rec.confidence === 'number' && rec.confidence > 0 && (
                                <span className="ml-1 text-[11px] text-text-tertiary">
                                  ({Math.round(rec.confidence * 100)}% conf
                                  {typeof rec.evidenceCount === 'number' && rec.evidenceCount > 0 ? `, ${rec.evidenceCount} evidence` : ''})
                                </span>
                              )}
                            </span>
                          ) : rec.masteryStatus === 'INSUFFICIENT_EVIDENCE' ? (
                            <span className="text-xs font-medium text-text-tertiary">
                              Status: <span className="font-semibold text-text-primary">New Topic (Awaiting Evidence)</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Action CTA */}
                      <div className="shrink-0 sm:pl-4 sm:border-l sm:border-border-muted flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                        {rec.isActionable ? (
                          <button
                            onClick={() => handleNavigateToAction(rec)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-95 transition-opacity shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer whitespace-nowrap"
                          >
                            <span>{getActionLabel(rec)}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[11px] font-medium text-text-tertiary italic">
                              {rec.reasonCode === 'TOPIC_LOCKED' ? 'Locked (Complete Prior Assessments)' : 'Content in preparation'}
                            </span>
                            <button
                              onClick={() => handleNavigateToAction(rec)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary text-xs font-medium hover:bg-surface-elevated transition-colors cursor-pointer"
                            >
                              <span>View Course</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cross-Course Discovery Recommendations for Enrolled Learners */}
          {courseRecommendations && courseRecommendations.length > 0 && selectedCourseId === 'ALL' && (
            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Compass className="w-5 h-5 text-signal" />
                    Explore More Courses Based on Your Interests
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Published courses aligned with your onboarding profile that you haven't enrolled in yet.
                  </p>
                </div>
                <Link
                  to="/learner/explore"
                  className="text-xs font-semibold text-signal hover:underline inline-flex items-center gap-1"
                >
                  Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseRecommendations.map((cr) => (
                  <div
                    key={cr.id}
                    className="rounded-2xl border border-border bg-surface hover:border-signal/40 p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-md bg-signal-soft/60 px-2 py-0.5 text-[11px] font-bold text-signal">
                          {cr.domain || cr.category || 'Course'}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                          {cr.difficulty}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-text-primary">
                        {cr.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {cr.description}
                      </p>
                      {cr.matchedInterest && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-text-tertiary bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/60">
                          <Sparkles className="w-3 h-3 text-signal" />
                          <span>Matches interest: <strong className="text-text-primary">{cr.matchedInterest}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-text-tertiary truncate max-w-[200px]">
                        {cr.reason}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/learner/courses/${cr.courseId}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                      >
                        Explore Course <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
