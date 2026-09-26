import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { RecommendedCourse } from '../types/learner.types';

interface RecommendedCoursesProps {
  recommendations: RecommendedCourse[];
}

export const RecommendedCourses: React.FC<RecommendedCoursesProps> = ({ recommendations }) => {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-signal" />
        <h2 className="text-lg font-semibold text-text-primary">Recommended for You</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((course) => (
          <div key={course.courseId} className="group rounded-2xl border border-border bg-surface hover:border-border-muted hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col cursor-pointer">
            <div className="p-5 flex-1">
              {course.level && (
                <span className="inline-block px-2 py-1 rounded-md bg-surface-disabled text-xs font-semibold text-text-secondary mb-3">
                  {course.level}
                </span>
              )}
              <h3 className="text-base font-semibold text-text-primary mb-2 group-hover:text-signal transition-colors">{course.title}</h3>
              <p className="text-sm text-text-secondary line-clamp-2 mb-4">{course.description}</p>
              
              {course.reason && (
                <div className="text-xs italic text-text-tertiary bg-surface-disabled px-3 py-2 rounded-lg">
                  {course.reason}
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 border-t border-border-muted flex items-center justify-between mt-auto">
              <span className="text-sm font-semibold text-signal">View Course</span>
              <ArrowRight className="w-4 h-4 text-signal transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
