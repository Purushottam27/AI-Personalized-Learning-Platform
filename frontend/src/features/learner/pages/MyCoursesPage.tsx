import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  LogOut,
} from 'lucide-react';
import type { EnrollmentStatus } from '../types/enrollment.types';

export const MyCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { enrollments, coursesMap, loading, error, refresh, handleWithdraw } = useMyEnrollments();
  const [filterStatus, setFilterStatus] = useState<EnrollmentStatus | 'ALL'>('ALL');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

  const filteredEnrollments = enrollments.filter((e) => {
    if (filterStatus === 'ALL') return true;
    return e.status === filterStatus;
  });

  const onWithdraw = async (enrollmentId: string) => {
    try {
      setWithdrawingId(enrollmentId);
      await handleWithdraw(enrollmentId);
      setConfirmWithdrawId(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to withdraw from course');
    } finally {
      setWithdrawingId(null);
    }
  };

  const statusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-text-tertiary flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Withdrawn
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-signal text-sm font-semibold tracking-wide uppercase mb-1">
            <Sparkles className="w-4 h-4" /> Academic Journey
          </div>
          <h1 className="text-3xl font-bold text-text-primary">My Courses</h1>
          <p className="text-text-secondary mt-1">
            Track your ongoing enrollments, review completed milestones, and continue study sessions.
          </p>
        </div>

        <button
          onClick={() => navigate('/learner/explore')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90 transition-opacity self-start md:self-auto"
        >
          <BookOpen className="w-4 h-4" /> Browse Catalog
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'WITHDRAWN'] as const).map((tab) => {
          const count =
            tab === 'ALL'
              ? enrollments.length
              : enrollments.filter((e) => e.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterStatus === tab
                  ? 'bg-surface-elevated text-signal shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <span>{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-surface text-[10px] text-text-tertiary">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content State */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
          <p className="text-sm text-text-secondary">Loading your enrolled courses...</p>
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
      ) : filteredEnrollments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-elevated border border-border text-center">
          <BookOpen className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            {filterStatus === 'ALL'
              ? 'No enrollments yet'
              : `No ${filterStatus.toLowerCase()} enrollments`}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            {filterStatus === 'ALL'
              ? 'You have not enrolled in any courses yet. Discover courses tailored to your interests and begin learning today.'
              : `You do not have any courses marked as ${filterStatus.toLowerCase()}.`}
          </p>
          {filterStatus === 'ALL' && (
            <button
              onClick={() => navigate('/learner/explore')}
              className="px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
            >
              Explore Available Courses
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEnrollments.map((enrollment) => {
            const course = coursesMap[enrollment.courseId];
            const isConfirming = confirmWithdrawId === enrollment._id;
            const isBusy = withdrawingId === enrollment._id;

            return (
              <div
                key={enrollment._id}
                className="rounded-2xl bg-surface-elevated border border-border flex flex-col justify-between overflow-hidden hover:border-signal/30 transition-all shadow-sm"
              >
                <div className="p-6 space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border text-text-secondary">
                      {course?.domain || 'Course'}
                    </span>
                    {statusBadge(enrollment.status)}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2
                      onClick={() => navigate(`/learner/courses/${enrollment.courseId}`)}
                      className="text-lg font-bold text-text-primary hover:text-signal cursor-pointer transition-colors line-clamp-1"
                    >
                      {course?.title || 'Loading Course...'}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                      {course?.description || 'View details and topic syllabus.'}
                    </p>
                  </div>

                  {/* Enrolled Date */}
                  <div className="flex items-center gap-2 text-xs text-text-tertiary pt-2 border-t border-border/60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Confirmation Dialog inline */}
                  {isConfirming && (
                    <div className="p-3 rounded-xl bg-error-soft border border-error/20 text-xs space-y-2">
                      <p className="text-error font-medium">
                        Are you sure you want to withdraw? You can re-enroll later, but active attempts will be cancelled.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isBusy}
                          onClick={() => onWithdraw(enrollment._id)}
                          className="px-3 py-1.5 rounded-lg bg-error text-white font-semibold hover:opacity-90 disabled:opacity-50 text-[11px]"
                        >
                          {isBusy ? 'Withdrawing...' : 'Confirm Withdraw'}
                        </button>
                        <button
                          onClick={() => setConfirmWithdrawId(null)}
                          className="px-3 py-1.5 rounded-lg border border-border text-text-primary hover:bg-surface font-semibold text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-surface/50 border-t border-border flex items-center justify-between gap-3">
                  {enrollment.status === 'ACTIVE' && !isConfirming && (
                    <button
                      onClick={() => setConfirmWithdrawId(enrollment._id)}
                      className="text-xs text-text-tertiary hover:text-error transition-colors flex items-center gap-1 px-2 py-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => navigate(`/learner/courses/${enrollment.courseId}`)}
                      className="py-2 px-3 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-elevated transition-colors"
                    >
                      Syllabus
                    </button>
                    {enrollment.status === 'ACTIVE' && (
                      <button
                        onClick={() => navigate(`/learner/courses/${enrollment.courseId}/learn`)}
                        className="py-2 px-4 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
