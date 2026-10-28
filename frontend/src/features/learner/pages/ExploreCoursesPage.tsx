import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExploreCourses } from '../hooks/useExploreCourses';
import { enrollInCourse } from '../api/enrollment.api';
import {
  Search,
  BookOpen,
  Clock,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import type { CourseDifficulty } from '../types/course.types';

export const ExploreCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { courses, pagination, query, loading, error, updateFilters, refresh } = useExploreCourses();
  const [searchTerm, setSearchTerm] = useState(query.search || '');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchTerm.trim() || undefined, page: 1 });
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as CourseDifficulty | '';
    updateFilters({ difficulty: val || undefined, page: 1 });
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingId(courseId);
      setActionMessage(null);
      await enrollInCourse(courseId);
      setActionMessage({
        id: courseId,
        type: 'success',
        text: 'Successfully enrolled! Redirecting to course...',
      });
      setTimeout(() => {
        navigate(`/learner/courses/${courseId}`);
      }, 1000);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Failed to enroll in course.';
      if (code === 'DIAGNOSTIC_REQUIRED') {
        setActionMessage({
          id: courseId,
          type: 'error',
          text: 'This course requires passing a diagnostic assessment before enrolling. View details to take the diagnostic.',
        });
      } else if (code === 'ALREADY_ENROLLED') {
        setActionMessage({
          id: courseId,
          type: 'success',
          text: 'You are already enrolled! Opening course...',
        });
        setTimeout(() => {
          navigate(`/learner/courses/${courseId}`);
        }, 800);
      } else {
        setActionMessage({
          id: courseId,
          type: 'error',
          text: msg,
        });
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const difficultyColors: Record<string, string> = {
    BEGINNER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    INTERMEDIATE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    ADVANCED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <div className="max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-signal text-sm font-semibold tracking-wide uppercase mb-1">
          <Sparkles className="w-4 h-4" /> Discover Knowledge
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Explore Courses</h1>
        <p className="text-text-secondary mt-1 max-w-2xl">
          Browse our catalog of evidence-driven courses, diagnostic-guided roadmaps, and targeted learning modules.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-elevated border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search courses by title or topic..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Filter className="w-4 h-4" />
            <span>Difficulty:</span>
          </div>
          <select
            value={query.difficulty || ''}
            onChange={handleDifficultyChange}
            aria-label="Filter courses by difficulty"
            className="px-3 py-2 text-sm rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <option value="">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Main Content State */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
          <p className="text-sm text-text-secondary">Discovering published courses...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-surface-elevated border border-border text-center">
          <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Failed to load courses</h3>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-elevated border border-border text-center">
          <BookOpen className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">No courses found</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-4">
            Try adjusting your search criteria or clearing filters to discover available learning roadmaps.
          </p>
          {(query.search || query.difficulty) && (
            <button
              onClick={() => {
                setSearchTerm('');
                updateFilters({ search: undefined, difficulty: undefined, page: 1 });
              }}
              className="px-4 py-2 text-sm rounded-xl border border-border text-text-primary hover:bg-surface font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isEnrolling = enrollingId === course._id;
              const msg = actionMessage?.id === course._id ? actionMessage : null;

              return (
                <div
                  key={course._id}
                  className="rounded-2xl bg-surface-elevated border border-border flex flex-col justify-between overflow-hidden hover:border-signal/40 transition-all duration-200 shadow-sm"
                >
                  <div className="p-6 space-y-4">
                    {/* Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-text-secondary">
                        {course.domain || course.category || 'General'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                          difficultyColors[course.difficulty] || 'bg-surface text-text-secondary border-border'
                        }`}
                      >
                        {course.difficulty}
                      </span>
                    </div>

                    {/* Title and Description */}
                    <div>
                      <h2
                        onClick={() => navigate(`/learner/courses/${course._id}`)}
                        className="text-lg font-bold text-text-primary hover:text-signal cursor-pointer transition-colors line-clamp-1"
                      >
                        {course.title}
                      </h2>
                      <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Metadata & Flags */}
                    <div className="flex items-center gap-4 text-xs text-text-tertiary pt-2 border-t border-border/60">
                      {course.estimatedDuration?.hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.estimatedDuration.hours} hrs
                        </span>
                      )}
                      {course.diagnosticPolicy?.enabled && (
                        <span className="flex items-center gap-1 text-signal font-medium">
                          <Award className="w-3.5 h-3.5" />
                          Diagnostic Gate
                        </span>
                      )}
                    </div>

                    {/* Action Message feedback */}
                    {msg && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                          msg.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-error-soft text-error border border-error/20'
                        }`}
                      >
                        {msg.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{msg.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-surface/50 border-t border-border flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/learner/courses/${course._id}`)}
                      className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-elevated transition-colors text-center"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleEnroll(course._id)}
                      disabled={isEnrolling}
                      className="flex-1 py-2 px-3 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
                    >
                      {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-border text-sm text-text-secondary">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCourses} courses)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => updateFilters({ page: pagination.page - 1 })}
                  className="p-2 rounded-xl border border-border hover:bg-surface-elevated disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateFilters({ page: pagination.page + 1 })}
                  className="p-2 rounded-xl border border-border hover:bg-surface-elevated disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
