/**
 * Temporary role dashboards for F2.3.
 *
 * These are honest empty-state placeholders, not fabricated data.
 * They show the user they are in the right place and what's coming,
 * without inventing fake stats, fake mastery, or fake enrollments.
 *
 * Full dashboards will be built in F2.4+.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, ShieldCheck, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';

// ─── Shared Layout ────────────────────────────────────────────────────────────

interface DashboardShellProps {
  icon: React.ReactNode;
  roleLabel: string;
  tagline: string;
  sections: { title: string; description: string }[];
  accentColor: string;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  icon,
  roleLabel,
  tagline,
  sections,
  accentColor,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-paper font-sans text-ink selection:bg-signal/20">
      {/* Top nav */}
      <header className="border-b border-ink/5 bg-paper/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-paper"
              style={{ backgroundColor: accentColor }}
            >
              {icon}
            </div>
            <div>
              <span className="text-sm font-semibold text-ink">{user?.name ?? 'User'}</span>
              <span className="ml-2 text-xs font-medium text-ink/40 uppercase tracking-wide">
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded px-2 py-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <p className="text-sm font-medium text-ink/40 mb-2 tracking-wide">
            Welcome back
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink leading-tight mb-3">
            {user?.name?.split(' ')[0] ?? 'Hello'},{' '}
            <span className="text-ink/40 font-light">
              {tagline}
            </span>
          </h1>
          <p className="text-ink/60 text-base max-w-xl">
            Your dashboard is being built. The features below are coming in the next release.
          </p>
        </motion.div>

        {/* Upcoming sections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.08 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-xl border border-ink/8 bg-white/50 p-6 flex flex-col gap-3 group"
            >
              <div
                className="w-10 h-10 rounded-lg opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: accentColor }}
              />
              <div>
                <h2 className="text-sm font-semibold text-ink mb-1">{section.title}</h2>
                <p className="text-xs text-ink/50 leading-relaxed">{section.description}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-xs text-ink/30 font-medium">
                <span>Coming soon</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

// ─── Learner Dashboard ────────────────────────────────────────────────────────

export const LearnerDashboard: React.FC = () => (
  <DashboardShell
    icon={<BookOpen className="w-4 h-4" />}
    roleLabel="Learner"
    tagline="your learning path is being prepared."
    accentColor="#c0633f"
    sections={[
      {
        title: 'My Courses',
        description: 'Browse, enroll, and continue your active courses from a single view.',
      },
      {
        title: 'Adaptive Learning Path',
        description: 'AI-generated study paths shaped by your goals, interests, and assessment results.',
      },
      {
        title: 'Assessment Results',
        description: 'View past assessments, scores, and evidence-backed progress over time.',
      },
      {
        title: 'Weaknesses & Interventions',
        description: 'Targeted resources recommended to address identified gaps in understanding.',
      },
      {
        title: 'Practice Sessions',
        description: 'Question-pool-based practice tailored to your weakest areas.',
      },
      {
        title: 'Progress Overview',
        description: 'Mastery tracking, streaks, and goal completion at a glance.',
      },
    ]}
  />
);

// ─── Instructor Dashboard ─────────────────────────────────────────────────────

export const InstructorDashboard: React.FC = () => (
  <DashboardShell
    icon={<GraduationCap className="w-4 h-4" />}
    roleLabel="Instructor"
    tagline="your courses are waiting to be built."
    accentColor="#4a6741"
    sections={[
      {
        title: 'My Courses',
        description: 'Create, edit, and publish courses to enrolled learners.',
      },
      {
        title: 'Lesson Builder',
        description: 'Add lessons, resources, and learning objectives to your courses.',
      },
      {
        title: 'Question Pools',
        description: 'Create reusable question banks to power assessments and practice sessions.',
      },
      {
        title: 'Assessment Configuration',
        description: 'Configure diagnostic and formative assessments with pass criteria.',
      },
      {
        title: 'Enrolled Learners',
        description: 'View learners enrolled in your courses and their overall progress.',
      },
      {
        title: 'Course Analytics',
        description: 'Understand engagement, completion rates, and assessment performance.',
      },
    ]}
  />
);

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => (
  <DashboardShell
    icon={<ShieldCheck className="w-4 h-4" />}
    roleLabel="Admin"
    tagline="the platform awaits."
    accentColor="#1a1a2e"
    sections={[
      {
        title: 'User Management',
        description: 'View, deactivate, reactivate, and manage all platform users.',
      },
      {
        title: 'Course Oversight',
        description: 'Review and approve courses before they go live to learners.',
      },
      {
        title: 'Platform Analytics',
        description: 'High-level metrics on learner engagement, course completions, and growth.',
      },
      {
        title: 'Audit Logs',
        description: 'Track sensitive platform actions for accountability and security review.',
      },
    ]}
  />
);
