/**
 * CourseWorkspacePage — Minimal Course Workspace / Editor shell.
 *
 * Route: /instructor/courses/:courseId
 * Rendered inside: InstructorLayout (sidebar + topbar already present)
 *
 * This is the foundation for the future Course Editor vertical slice.
 *
 * Currently shows:
 * - Real course data fetched from GET /api/v1/courses/:courseId
 * - Course title, DRAFT status badge
 * - Core metadata summary
 * - Placeholder areas for future Topic, Resource, Assessment management
 *
 * Does NOT implement:
 * - Topic management
 * - Lesson management
 * - Resource management
 * - Practice builder
 * - Question bank
 * - Assessment builder
 * - Publishing workflow
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Globe,
  Archive,
  Layers,
  ClipboardList,
  Clock,
  Users,
} from 'lucide-react';
import { useCourse } from '../hooks/useCourse';
import Button from '../../../components/ui/Button';
import type { CourseStatus, CourseDifficulty } from '../types/instructor.types';

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: CourseStatus }> = ({ status }) => {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-sage-soft text-sage border border-sage/20">
        <Globe className="w-3 h-3" aria-hidden="true" />
        Published
      </span>
    );
  }
  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-signal-soft text-signal border border-signal/20">
        <FileText className="w-3 h-3" aria-hidden="true" />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-surface-disabled text-text-tertiary border border-border">
      <Archive className="w-3 h-3" aria-hidden="true" />
      Archived
    </span>
  );
};

// ─── Difficulty label ─────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

// ─── Metadata row ─────────────────────────────────────────────────────────────

const MetaItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-semibold uppercase tracking-widest text-text-disabled">
      {label}
    </span>
    <span className="text-sm text-text-secondary">{value}</span>
  </div>
);

// ─── Coming soon section ──────────────────────────────────────────────────────

const ComingSoonBlock: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-xl border border-dashed border-border bg-surface select-none cursor-default">
    <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-text-disabled" strokeWidth={1.5} />
    </div>
    <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
    <p className="text-xs text-text-tertiary max-w-xs leading-relaxed">{description}</p>
    <span className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-text-disabled px-2 py-1 rounded bg-surface-disabled border border-border-muted">
      Coming soon
    </span>
  </div>
);

// ─── Page component ───────────────────────────────────────────────────────────

export const CourseWorkspacePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, isLoading, error } = useCourse(courseId);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-4" />
        <p className="text-sm text-text-secondary font-medium">Loading course workspace...</p>
      </div>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-surface-disabled flex items-center justify-center mb-4 border border-border">
          <AlertCircle className="w-8 h-8 text-signal" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          {error === "This course could not be found." ? 'Course not found' : 'Access denied'}
        </h2>
        <p className="text-text-secondary mb-6 max-w-md">
          {error ?? 'This course could not be loaded.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/instructor/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/instructor/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded px-1 -ml-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </button>

        {/* Title and status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
              Course Workspace
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text-primary leading-tight">
              {course.title}
            </h1>
            <StatusBadge status={course.status} />
          </div>
        </div>

        {/* Draft notice */}
        {course.status === 'DRAFT' && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-signal/20 bg-signal-soft text-signal">
            <FileText className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Your course is saved as a draft.</p>
              <p className="text-xs mt-0.5 text-signal/70">
                Continue building its learning structure. Publishing will be available once Topics,
                Resources, and Assessments are ready.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Course metadata summary */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Course details"
        className="p-6 rounded-xl border border-border bg-surface space-y-5"
      >
        <h2 className="text-sm font-semibold text-text-primary">Course details</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <MetaItem label="Domain" value={course.domain} />
          <MetaItem label="Category" value={course.category} />
          <MetaItem
            label="Difficulty"
            value={DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
          />
          {course.estimatedDuration && (
            <MetaItem
              label="Duration"
              value={[
                course.estimatedDuration.weeks ? `${course.estimatedDuration.weeks}w` : null,
                course.estimatedDuration.hours ? `${course.estimatedDuration.hours}h` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        </div>

        {/* Description */}
        <div className="pt-4 border-t border-border-muted">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-2">
            Description
          </p>
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
            {course.description}
          </p>
        </div>

        {/* Objectives */}
        {course.objectives && course.objectives.length > 0 && (
          <div className="pt-4 border-t border-border-muted">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-3">
              Learning objectives
            </p>
            <ul className="space-y-2">
              {course.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-signal shrink-0" aria-hidden="true" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progression policy */}
        {course.progressionPolicy && (
          <div className="pt-4 border-t border-border-muted">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-2">
              Topic progression
            </p>
            <p className="text-sm text-text-secondary">
              {course.progressionPolicy.lockingEnabled
                ? 'Sequential — learners must complete Topics in order.'
                : 'Open — learners can access Topics independently.'}
            </p>
          </div>
        )}
      </motion.section>

      {/* Course structure — future sections */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Course structure"
        className="space-y-4"
      >
        <div>
          <h2 className="text-base font-semibold text-text-primary">Course structure</h2>
          <p className="text-sm text-text-secondary mt-1">
            Build the learning structure of your course. Topics, Resources, Practice, and
            Assessments will be managed here.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ComingSoonBlock
            icon={Layers}
            title="Topics &amp; Lessons"
            description="Organize your course into Topics. Add Lessons and learning resources under each Topic."
          />
          <ComingSoonBlock
            icon={ClipboardList}
            title="Practice &amp; Assessments"
            description="Create practice exercises and assessments to evaluate learner understanding."
          />
          <ComingSoonBlock
            icon={Clock}
            title="Learning Sequence"
            description="Define the progression order and unlock conditions for your Topics."
          />
          <ComingSoonBlock
            icon={Users}
            title="Enrolled Learners"
            description="View and manage learners enrolled in this course once it is published."
          />
        </div>
      </motion.section>
    </div>
  );
};
