import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RecommendedCourse } from '../types/learner.types';

interface RecommendedCoursesProps {
  recommendations: RecommendedCourse[];
}

export const RecommendedCourses: React.FC<RecommendedCoursesProps> = ({ recommendations }) => {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-border-muted pb-3">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Explore what is next</p>
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-signal" /><h2 className="font-display text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Recommended for You</h2></div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((course) => (
          <Link
            key={course.courseId}
            to={`/learner/courses/${course.courseId}`}
            className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-linear-to-br from-surface-elevated to-surface no-underline shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-signal/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <div className="flex-1 p-5">
              {course.level && (
                <span className="mb-3 inline-flex items-center rounded-full border border-sage/20 bg-sage-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-sage">
                  {course.level.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </span>
              )}
              <h3 className="mb-2 break-words font-display text-lg font-semibold leading-snug tracking-tight text-text-primary transition-colors group-hover:text-signal">{course.title}</h3>
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-text-secondary">{course.description}</p>
              
              {course.reason && (
                <div className="text-xs italic text-text-tertiary bg-surface-disabled px-3 py-2 rounded-lg">
                  {course.reason}
                </div>
              )}
            </div>
            
            <div className="mt-auto flex items-center justify-between border-t border-border-muted px-5 py-4 transition-colors group-hover:bg-signal-soft/30">
              <span className="text-sm font-semibold text-signal">View Course</span>
              <ArrowRight className="w-4 h-4 text-signal transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
