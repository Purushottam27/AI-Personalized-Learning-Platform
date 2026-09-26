import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-6">
        <div className="w-8 h-8 opacity-50 bg-signal mask-sparkles" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
      </div>
      <h2 className="text-2xl font-semibold text-text-primary mb-3">{title}</h2>
      <p className="text-text-secondary max-w-md">
        {description}
      </p>
      <div className="mt-8 px-4 py-2 rounded-lg bg-surface-disabled text-xs font-semibold text-text-tertiary uppercase tracking-wider">
        Coming Soon
      </div>
    </div>
  );
};
