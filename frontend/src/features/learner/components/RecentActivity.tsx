import React from 'react';
import { History, BookOpen, Target, CheckCircle2, PlusCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RecentActivityItem } from '../types/learner.types';

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  if (activities.length === 0) {
    return null;
  }

  const getIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'LESSON_COMPLETED': return <BookOpen className="w-4 h-4 text-sage" />;
      case 'PRACTICE_COMPLETED': return <Target className="w-4 h-4 text-signal" />;
      case 'ASSESSMENT_PASSED': return <CheckCircle2 className="w-4 h-4 text-sage" />;
      case 'COURSE_ENROLLED': return <PlusCircle className="w-4 h-4 text-text-secondary" />;
      default: return <History className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getActionText = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'LESSON_COMPLETED': return 'Completed lesson';
      case 'PRACTICE_COMPLETED': return 'Completed practice';
      case 'ASSESSMENT_PASSED': return 'Passed assessment';
      case 'COURSE_ENROLLED': return 'Enrolled in course';
      default: return 'Activity on';
    }
  };

  const getActivityLink = (activity: RecentActivityItem): string | null => {
    if (!/^[0-9a-fA-F]{24}$/.test(activity.id)) return null;
    if (activity.type === 'PRACTICE_COMPLETED') return `/learner/practice-attempts/${activity.id}`;
    if (activity.type === 'ASSESSMENT_PASSED') return `/learner/assessment-attempts/${activity.id}`;
    if (activity.type === 'COURSE_ENROLLED') return `/learner/courses/${activity.id}`;
    return null;
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-text-secondary" />
        <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <ul className="divide-y divide-border">
          {activities.map((activity) => {
            const link = getActivityLink(activity);

            const content = (
              <>
                <div className="mt-1 sm:mt-0 p-2 rounded-full bg-surface-elevated border border-border-muted shrink-0">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    <span className="text-text-secondary font-normal mr-1">{getActionText(activity.type)}</span>
                    {activity.title}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-xs text-text-tertiary whitespace-nowrap">
                  <span>{activity.date}</span>
                  {link && (
                    <ArrowUpRight className="h-3.5 w-3.5 text-signal" />
                  )}
                </div>
              </>
            );

            return (
              <li key={activity.id}>
                {link ? (
                  <Link
                    to={link}
                    className="p-4 sm:px-6 flex items-start sm:items-center gap-4 hover:bg-surface-elevated transition-colors cursor-pointer block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="p-4 sm:px-6 flex items-start sm:items-center gap-4 hover:bg-surface-elevated transition-colors">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

