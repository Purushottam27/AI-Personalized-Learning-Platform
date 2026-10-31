import React from 'react';
import { ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LearningStrength, LearningWeakness } from '../types/learner.types';

interface StrengthsWeaknessesProps {
  strengths: LearningStrength[];
  needsAttention: LearningWeakness[];
}

export const StrengthsWeaknesses: React.FC<StrengthsWeaknessesProps> = ({ strengths, needsAttention }) => {
  const navigate = useNavigate();
  if (strengths.length === 0 && needsAttention.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-linear-to-br from-surface-elevated to-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sage/25 sm:p-6" aria-labelledby="strengths-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/10 text-sage"><TrendingUp className="h-5 w-5" /></div>
          <h3 id="strengths-heading" className="font-display text-lg font-semibold tracking-tight text-text-primary">Strengths</h3>
        </div>
        {strengths.length > 0 ? (
          <ul className="space-y-3">
            {strengths.map((item, index) => (
              <li key={`strength-${item.topicId || index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border-muted bg-surface px-3.5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-sage" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary">{item.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-surface-elevated px-3 py-4 text-sm text-text-tertiary">Keep learning to build evidence of your strengths.</p>
        )}
      </section>

      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-linear-to-br from-surface-elevated to-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/25 sm:p-6" aria-labelledby="attention-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal/10 text-signal"><AlertCircle className="h-5 w-5" /></div>
          <h3 id="attention-heading" className="font-display text-lg font-semibold tracking-tight text-text-primary">Needs Attention</h3>
        </div>
        {needsAttention.length > 0 ? (
          <ul className="space-y-2">
            {needsAttention.map((item, index) => {
              const canReview = Boolean(item.courseId && /^[0-9a-fA-F]{24}$/.test(item.courseId) && /^[0-9a-fA-F]{24}$/.test(item.topicId));
              return (
                <li key={`weakness-${item.topicId || index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border-muted bg-surface px-3.5 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary">{item.title}</span>
                  <button
                    type="button"
                    disabled={!canReview}
                    onClick={() => canReview && navigate(`/learner/courses/${item.courseId}/learn?topicId=${encodeURIComponent(item.topicId)}`)}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-signal transition-colors hover:bg-signal-soft hover:text-signal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Review <ArrowRight className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg bg-surface-elevated px-3 py-4 text-sm text-text-tertiary">No topics need immediate review.</p>
        )}
      </section>
    </div>
  );
};
