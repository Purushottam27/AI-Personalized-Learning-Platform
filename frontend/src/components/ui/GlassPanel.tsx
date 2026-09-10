/**
 * GlassPanel — the shared editorial glass surface used for auth panels.
 * Uses backdrop-blur + semi-transparent paper for depth without "neon glassmorphism".
 */
import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '' }) => (
  <div
    className={[
      'relative rounded-2xl border border-ink/10',
      'bg-paper/70 backdrop-blur-md shadow-xl shadow-ink/5',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

export default GlassPanel;
