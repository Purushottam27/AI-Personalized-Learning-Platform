import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BookOpen,
  Clock3,
  FileText,
  Globe,
  Layers3,
  Loader2,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useCourse } from '../hooks/useCourse';
import { publishCourse, archiveCourse } from '../api/instructor.api';
import TopicManagement from '../components/TopicManagement/TopicManagement';
import type { CourseDifficulty, CourseStatus } from '../types/instructor.types';
import type { Topic } from '../types/topic.types';

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const StatusBadge: React.FC<{ status: CourseStatus }> = ({ status }) => {
  const config = status === 'PUBLISHED'
    ? { label: 'Published', Icon: Globe, classes: 'border-sage/20 bg-sage-soft text-sage' }
    : status === 'DRAFT'
      ? { label: 'Draft', Icon: FileText, classes: 'border-signal/20 bg-signal-soft text-signal' }
      : { label: 'Archived', Icon: Archive, classes: 'border-border bg-surface-disabled text-text-secondary' };
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${config.classes}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
};

const MetaItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0 space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
    <p className="break-words text-sm font-medium text-text-primary">{value}</p>
  </div>
);

export const CourseWorkspacePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, isLoading, error, refetch } = useCourse(courseId);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-signal" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Loading course workspace…</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-error/20 bg-error-soft text-error">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-text-primary">Unable to open this course</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{error ?? 'This course could not be loaded.'}</p>
        <Button variant="secondary" onClick={() => navigate('/instructor/courses')} className="mt-6 cursor-pointer">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Courses
        </Button>
      </div>
    );
  }

  const duration = [
    course.estimatedDuration?.weeks ? `${course.estimatedDuration.weeks} weeks` : null,
    course.estimatedDuration?.hours ? `${course.estimatedDuration.hours} hours` : null,
  ].filter(Boolean).join(' · ');

  const openTopic = (topic: Topic) => {
    navigate(`/instructor/courses/${course._id}/topics/${topic._id}`);
  };

  const handlePublish = async () => {
    try {
      setIsActing(true);
      setActionError(null);
      await publishCourse(course._id);
      await refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to publish course.');
    } finally {
      setIsActing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this course? Learners will no longer be able to discover or enroll in it.')) {
      return;
    }
    try {
      setIsActing(true);
      setActionError(null);
      await archiveCourse(course._id);
      await refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to archive course.');
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-14">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="space-y-5"
      >
        <button
          type="button"
          onClick={() => navigate('/instructor/courses')}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-text-secondary transition-all duration-150 hover:bg-surface-elevated hover:text-text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          My Courses
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Course Workspace</p>
            <h1 className="break-words font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">{course.title}</h1>
            <StatusBadge status={course.status} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {course.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => navigate(`/instructor/courses/${course._id}/setup`)} className="w-full shrink-0 sm:w-auto">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Continue Setup
                </Button>
                <Button onClick={handlePublish} disabled={isActing} className="w-full shrink-0 sm:w-auto">
                  {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Publish Course
                </Button>
              </>
            )}
            {course.status === 'PUBLISHED' && (
              <Button variant="secondary" onClick={handleArchive} disabled={isActing} className="w-full shrink-0 sm:w-auto text-error hover:border-error/40">
                {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive Course
              </Button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 rounded-xl border border-error/20 bg-error-soft p-3 text-xs text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {course.status === 'DRAFT' && (
          <div className="flex items-start gap-3 rounded-xl border border-signal/20 bg-signal-soft p-4 text-signal">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Your course is saved as a draft.</p>
              <p className="text-sm leading-relaxed text-text-secondary">Continue setting up course-level information, then manage each topic and its lessons from the course structure below.</p>
            </div>
          </div>
        )}
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.04, ease: 'easeOut' }}
        aria-labelledby="course-details-heading"
        className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="course-details-heading" className="text-base font-semibold text-text-primary">Course details</h2>
            <p className="text-xs text-text-secondary">The course-level information learners will see.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          <MetaItem label="Domain" value={course.domain} />
          <MetaItem label="Category" value={course.category} />
          <MetaItem label="Difficulty" value={DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty} />
          {duration && <MetaItem label="Estimated duration" value={<span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />{duration}</span>} />}
        </div>

        <div className="border-t border-border-muted pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Description</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{course.description}</p>
        </div>

        {course.objectives.length > 0 && (
          <div className="border-t border-border-muted pt-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Course learning objectives</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {course.objectives.map((objective, index) => (
                <li key={`${index}-${objective}`} className="flex items-start gap-2.5 rounded-lg bg-surface-elevated p-3 text-sm leading-relaxed text-text-secondary">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage"><span className="text-[10px] font-bold">{index + 1}</span></span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        {course.progressionPolicy && (
          <div className="border-t border-border-muted pt-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Topic progression</p>
            <p className="text-sm text-text-secondary">{course.progressionPolicy.lockingEnabled ? 'Sequential — learners must complete topics in order.' : 'Open — learners can access topics independently.'}</p>
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.08, ease: 'easeOut' }}
        aria-labelledby="course-topics-heading"
        className="space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="course-topics-heading" className="text-base font-semibold text-text-primary">Course structure</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">Organize the course into topics. Open a topic to manage its details, lessons, and future learning materials on a dedicated page.</p>
          </div>
        </div>

        <TopicManagement
          courseId={course._id}
          courseStatus={course.status}
          onManageTopic={openTopic}
        />
      </motion.section>
    </div>
  );
};
