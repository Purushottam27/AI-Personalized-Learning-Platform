import React from 'react';
import { Check } from 'lucide-react';

export interface NavSection {
  id: string;
  label: string;
  isCompleted: boolean;
}

interface CourseSetupNavProps {
  sections: NavSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  className?: string;
}

export const CourseSetupNav: React.FC<CourseSetupNavProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  className = '',
}) => {
  return (
    <nav aria-label="Course Setup" className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4 hidden md:block select-none">
        Course Setup
      </h3>
      <ul className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
        {sections.map((section, index) => {
          const isActive = section.id === activeSectionId;
          const isCompleted = section.isCompleted;

          return (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'relative flex items-center gap-3 w-full px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus text-left',
                  isActive
                    ? 'bg-signal-soft text-signal shadow-sm'
                    : isCompleted
                    ? 'text-sage hover:bg-surface-elevated hover:shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated hover:shadow-sm',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex items-center justify-center shrink-0 rounded-full w-5 h-5 border text-[10px] transition-colors',
                    isActive
                      ? 'border-signal bg-signal text-paper'
                      : isCompleted
                      ? 'border-sage bg-sage text-paper'
                      : 'border-border-muted text-text-tertiary bg-surface',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check className="w-3 h-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
