import React from 'react';
import { ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';
import type { LearningStrength, LearningWeakness } from '../types/learner.types';

interface StrengthsWeaknessesProps {
  strengths: LearningStrength[];
  needsAttention: LearningWeakness[];
}

export const StrengthsWeaknesses: React.FC<StrengthsWeaknessesProps> = ({ strengths, needsAttention }) => {
  if (strengths.length === 0 && needsAttention.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Needs Attention */}
      <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-signal" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Needs Attention</h3>
        </div>
        
        {needsAttention.length > 0 ? (
          <ul className="space-y-3 flex-1">
            {needsAttention.map((item, index) => (
              <li key={`weakness-${index}`} className="flex items-center justify-between group">
                <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">{item.title}</span>
                <button className="text-xs font-semibold text-signal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100">
                  Review <ArrowRight className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-sm text-text-tertiary italic">No topics need immediate review.</p>
          </div>
        )}
      </div>

      {/* Strengths */}
      <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-sage" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Strengths</h3>
        </div>
        
        {strengths.length > 0 ? (
          <ul className="space-y-3 flex-1">
            {strengths.map((item, index) => (
              <li key={`strength-${index}`} className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">{item.title}</span>
                <div className="w-2 h-2 rounded-full bg-sage/50"></div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-sm text-text-tertiary italic">Keep learning to build your strengths.</p>
          </div>
        )}
      </div>
    </div>
  );
};
