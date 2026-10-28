import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseDetail } from '../hooks/useCourseDetail';
import {
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ListOrdered,
  FileText,
  Sparkles,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, topics, isEnrolled, loading, enrolling, error, enroll } = useCourseDetail(courseId);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
        <p className="text-sm text-text-secondary">Loading course details...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-surface-elevated border border-border text-center mt-8">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Course Not Found</h2>
        <p className="text-sm text-text-secondary mb-6">{error || 'The requested course does not exist or is not available.'}</p>
        <button
          onClick={() => navigate('/learner/explore')}
          className="px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const handleEnrollClick = async () => {
    try {
      setEnrollError(null);
      await enroll();
      navigate(`/learner/courses/${courseId}/learn`);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Enrollment failed.';
      if (code === 'DIAGNOSTIC_REQUIRED') {
        setEnrollError('A passing score on the diagnostic assessment is required before enrolling.');
      } else {
        setEnrollError(msg);
      }
    }
  };

  const difficultyColors: Record<string, string> = {
    BEGINNER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    INTERMEDIATE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    ADVANCED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  const hasDiagnostic = course.diagnosticPolicy?.enabled;

  return (
    <div className="max-w-5xl space-y-8 pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <button onClick={() => navigate('/learner/explore')} className="hover:text-text-primary">
          Explore
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-secondary">{course.domain || 'Courses'}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium truncate max-w-xs">{course.title}</span>
      </div>

      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-surface-elevated border border-border space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface border border-border text-text-secondary">
              {course.domain} • {course.category}
            </span>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                difficultyColors[course.difficulty] || 'bg-surface text-text-secondary border-border'
              }`}
            >
              {course.difficulty}
            </span>
            {hasDiagnostic && (
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-signal/10 text-signal border border-signal/20 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Diagnostic Assessment
              </span>
            )}
          </div>

          {isEnrolled && (
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Enrolled
            </span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-text-primary leading-tight">{course.title}</h1>
          <p className="text-text-secondary mt-3 text-base leading-relaxed max-w-3xl">
            {course.description}
          </p>
        </div>

        {/* Course Attributes */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/60 text-xs text-text-secondary">
          {course.estimatedDuration?.hours && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-signal" />
              <span>
                <strong>{course.estimatedDuration.hours} hours</strong> estimated
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-signal" />
            <span>
              <strong>{topics.length}</strong> {topics.length === 1 ? 'Topic' : 'Topics'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-signal" />
            <span>Evidence-Driven Progression</span>
          </div>
        </div>

        {/* Enrollment Feedback */}
        {enrollError && (
          <div className="p-4 rounded-2xl bg-error-soft border border-error/20 flex items-start gap-3 text-sm text-error">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Unable to complete enrollment</p>
              <p className="text-xs">{enrollError}</p>
            </div>
          </div>
        )}

        {/* CTA Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {isEnrolled ? (
            <button
              onClick={() => navigate(`/learner/courses/${courseId}/learn`)}
              className="py-3 px-6 rounded-2xl bg-signal text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : hasDiagnostic ? (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                onClick={() => navigate(`/learner/courses/${courseId}/diagnostic`)}
                className="py-3 px-6 rounded-2xl bg-signal text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
              >
                <Award className="w-4 h-4" />
                <span>Take Diagnostic Assessment</span>
              </button>
              <button
                onClick={handleEnrollClick}
                disabled={enrolling}
                className="py-3 px-6 rounded-2xl border border-border text-text-primary font-semibold text-sm hover:bg-surface transition-colors flex items-center justify-center gap-2"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll (if passed)'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnrollClick}
              disabled={enrolling}
              className="py-3 px-6 rounded-2xl bg-signal text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            >
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll in Course'}
            </button>
          )}

          <button
            onClick={() => navigate('/learner/explore')}
            className="py-3 px-5 rounded-2xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface text-center"
          >
            Back to Catalog
          </button>
        </div>
      </div>

      {/* Objectives & Diagnostic Requirement details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Objectives */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-surface-elevated border border-border space-y-4">
          <div className="flex items-center gap-2 text-text-primary font-bold text-lg">
            <Sparkles className="w-5 h-5 text-signal" />
            <h2>What You Will Learn</h2>
          </div>
          {course.objectives && course.objectives.length > 0 ? (
            <ul className="space-y-2.5">
              {course.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary">No specific learning objectives listed.</p>
          )}
        </div>

        {/* Prerequisites and Diagnostic Notice */}
        <div className="p-6 rounded-3xl bg-surface-elevated border border-border space-y-4">
          <div className="flex items-center gap-2 text-text-primary font-bold text-lg">
            <ShieldCheck className="w-5 h-5 text-signal" />
            <h2>Course Policy</h2>
          </div>

          <div className="space-y-3 text-xs text-text-secondary">
            {hasDiagnostic && (
              <div className="p-3 rounded-2xl bg-signal/10 border border-signal/20 space-y-1">
                <p className="font-semibold text-signal">Diagnostic Assessment Required</p>
                <p className="text-text-secondary">
                  Passing score:{' '}
                  <strong>{course.diagnosticPolicy?.passingScore ?? 70}%</strong>
                </p>
                <p className="text-text-tertiary">
                  Demonstrate foundational knowledge or test out of prerequisite topics.
                </p>
              </div>
            )}

            {course.prerequisites?.knowledge && course.prerequisites.knowledge.length > 0 && (
              <div>
                <p className="font-semibold text-text-primary mb-1">Recommended Knowledge:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-text-tertiary">
                  {course.prerequisites.knowledge.map((k, idx) => (
                    <li key={idx}>{k}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 text-text-tertiary border-t border-border">
              Progression:{' '}
              <span className="font-medium text-text-primary">
                {course.progressionPolicy?.lockingEnabled ? 'Sequential Topic Unlocking' : 'Flexible Self-Paced'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Outline */}
      <div className="p-6 rounded-3xl bg-surface-elevated border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary font-bold text-lg">
            <BookOpen className="w-5 h-5 text-signal" />
            <h2>Course Syllabus & Topics ({topics.length})</h2>
          </div>
        </div>

        {topics.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4">No published topics available for this course yet.</p>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <div
                key={topic._id}
                className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{topic.title}</h3>
                    {topic.description && (
                      <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">{topic.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Topic Module</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
