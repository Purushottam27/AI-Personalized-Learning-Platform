/**
 * GlassPanel — the shared editorial glass surface used for auth panels.
 * Uses backdrop-blur + semi-transparent surface for depth without "neon glassmorphism".
 */
import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
}) => (
  <div
    className={[
      'relative rounded-2xl border border-border',
      'bg-surface/90 backdrop-blur-md shadow-sm shadow-ink/5',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

export default GlassPanel;