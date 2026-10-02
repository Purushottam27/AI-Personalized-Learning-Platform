import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, PlusCircle, AlertCircle, RefreshCw, FileText, Globe, Archive, BookOpen } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import Button from '../../../components/ui/Button';
import type { CourseStatus } from '../types/instructor.types';

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
}) => (
  <div className="p-5 rounded-xl border border-border bg-linear-to-br from-surface-elevated to-surface flex flex-col justify-between h-full shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-signal/30 hover:shadow-(--shadow-premium-card)">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{title}</span>
      {icon && <div>{icon}</div>}
    </div>
    <span className="text-3xl font-serif text-text-primary">{value}</span>
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: CourseStatus }) => {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-sage-soft text-sage border border-sage/20">
        Published
      </span>
    );
  }
  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-signal-soft text-signal border border-signal/20">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-surface-disabled text-text-tertiary border border-border">
      Archived
    </span>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyWorkspace = ({ onCreateCourse }: { onCreateCourse: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="flex flex-col items-center justify-center min-h-[55vh] text-center px-6"
  >
    <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-6 shadow-sm">
      <BookOpen className="w-8 h-8 text-signal" strokeWidth={1.5} />
    </div>

    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-4">
      Your Teaching Workspace
    </p>

    <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-text-primary mb-4 max-w-md leading-tight">
      Your first course starts here.
    </h1>

    <p className="text-text-secondary text-base max-w-sm mb-10 leading-relaxed">
      You haven't created a course yet. Build your first learning experience
      and start shaping how your learners learn.
    </p>

    <Button onClick={onCreateCourse}>
      <PlusCircle className="w-5 h-5" />
      Create your first course
    </Button>
  </motion.div>
);

// ─── Dashboard page ───────────────────────────────────────────────────────────

export const InstructorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { courses, isEmpty, isLoading, error } = useInstructorCourses();
  const navigate = useNavigate();

  const handleCreateCourse = () => navigate('/instructor/courses/create');

  // Loading
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-4" />
        <p className="text-sm text-text-secondary font-medium">Loading workspace...</p>
      </div>
    );
  }

  // Genuine API / network error
  if (error) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-surface-disabled flex items-center justify-center mb-4 border border-border">
          <AlertCircle className="w-8 h-8 text-signal" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load workspace</h2>
        <p className="text-text-secondary mb-6 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} variant="secondary">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  // Valid empty state — instructor has no courses yet
  if (isEmpty) {
    return <EmptyWorkspace onCreateCourse={handleCreateCourse} />;
  }

  // Dashboard with real data
  const totalCourses = courses.length;
  const published = courses.filter(c => c.status === 'PUBLISHED').length;
  const drafts = courses.filter(c => c.status === 'DRAFT').length;
  const archived = courses.filter(c => c.status === 'ARCHIVED').length;

  return (
    <div className="space-y-10 pb-12 max-w-6xl">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
      >
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Teaching Workspace
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-text-primary mb-3">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Instructor'}
          </h1>
          <p className="text-text-secondary max-w-xl text-base">
            Create, manage, and improve the learning experiences you build for your learners.
          </p>
        </div>
        <div className="shrink-0">
          <Button onClick={handleCreateCourse}>
            <PlusCircle className="w-5 h-5" />
            Create Course
          </Button>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard title="Total Courses" value={totalCourses} />
        <StatCard title="Published" value={published} icon={<Globe className="w-4 h-4 text-sage" />} />
        <StatCard title="Drafts" value={drafts} icon={<FileText className="w-4 h-4 text-signal" />} />
        <StatCard title="Archived" value={archived} icon={<Archive className="w-4 h-4 text-text-tertiary" />} />
      </motion.section>

      {/* Course list */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5 pt-2"
      >
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Your Courses</h2>
          <p className="text-sm text-text-secondary">
            A quick view of the courses you're currently building and managing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {courses.slice(0, 4).map(course => (
            <div
              key={course._id}
              className="p-5 rounded-xl border border-border bg-linear-to-br from-surface to-surface-elevated hover:border-signal/30 transition-all duration-300 hover:-translate-y-1 flex flex-col sm:flex-row gap-4 justify-between group shadow-sm hover:shadow-(--shadow-premium-card)"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={course.status} />
                  {course.difficulty && (
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
                      • {course.difficulty}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-text-primary group-hover:text-signal transition-colors duration-300">
                  {course.title}
                </h3>
                {course.domain && (
                  <p className="text-sm text-text-secondary">{course.domain}</p>
                )}
              </div>
              <div className="flex items-center sm:items-start justify-between sm:flex-col sm:justify-center shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/instructor/courses/${course._id}`)}
                >
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </div>

        {totalCourses > 4 && (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => navigate('/instructor/courses')}>
              View all courses
            </Button>
          </div>
        )}
      </motion.section>
    </div>
  );
};
