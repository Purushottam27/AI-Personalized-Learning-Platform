import React, { useState } from 'react';
import { motion } from 'framer-motion';

type NodeKey = 'learner' | 'instructor' | 'platform' | 'admin';

interface EcosystemNode {
  key: NodeKey;
  label: string;
  description: string;
  connects: NodeKey[];
}

const nodes: EcosystemNode[] = [
  {
    key: 'learner',
    label: 'Learner',
    description: 'Engages with content, completes assessments, and produces evidence of learning.',
    connects: ['platform'],
  },
  {
    key: 'instructor',
    label: 'Instructor',
    description: 'Designs courses, creates question pools, and monitors their learners\' progress.',
    connects: ['platform'],
  },
  {
    key: 'platform',
    label: 'Platform',
    description: 'Understands each learner\'s evidence, adapts paths, and coordinates every interaction.',
    connects: ['learner', 'instructor', 'admin'],
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Governs platform health, manages users, and ensures the learning environment operates correctly.',
    connects: ['platform'],
  },
];

const EcosystemSection: React.FC = () => {
  const [activeNode, setActiveNode] = useState<NodeKey | null>(null);

  const isHighlighted = (key: NodeKey) => {
    if (!activeNode) return true; // all visible when none selected
    if (activeNode === key) return true;
    const active = nodes.find(n => n.key === activeNode);
    return active?.connects.includes(key) ?? false;
  };

  const isDimmed = (key: NodeKey) => !isHighlighted(key);

  return (
    <section className="py-24 bg-surface/30 border-y border-muted/10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-signal font-semibold tracking-wider text-sm mb-4"
          >
            BUILT FOR A LEARNING ECOSYSTEM
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-6 text-ink"
          >
            Together, we make learning better.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted max-w-2xl mx-auto"
          >
            Hover a role to see how it connects. The platform coordinates every relationship.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Column 1: Learner + Admin */}
          <div className="flex flex-col gap-6">
            {(['learner', 'admin'] as NodeKey[]).map((key) => {
              const node = nodes.find(n => n.key === key)!;
              return (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: key === 'learner' ? 0 : 0.1 }}
                  onMouseEnter={() => setActiveNode(key)}
                  onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode(key)}
                  onBlur={() => setActiveNode(null)}
                  className={`text-left w-full p-6 rounded-2xl border transition-all duration-300 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                    isDimmed(key)
                      ? 'bg-paper border-muted/10 opacity-40'
                      : activeNode === key
                      ? 'bg-ink text-paper border-ink shadow-lg'
                      : 'bg-paper border-muted/20 shadow-sm'
                  }`}
                >
                  <div className={`font-display font-medium text-xl mb-2 ${activeNode === key ? 'text-paper' : 'text-ink'}`}>
                    {node.label}
                  </div>
                  <div className={`text-sm leading-relaxed transition-colors ${activeNode === key ? 'text-paper/80' : 'text-muted'}`}>
                    {node.description}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Column 2: Platform (center) */}
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Connection arrows */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-2 text-muted/30 text-xs font-medium hidden md:flex"
            >
              <div className="h-8 w-px bg-muted/20" />
              <span className="rotate-90 text-[10px] tracking-widest uppercase">connects</span>
              <div className="h-8 w-px bg-muted/20" />
            </motion.div>

            {(() => {
              const node = nodes.find(n => n.key === 'platform')!;
              return (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  onMouseEnter={() => setActiveNode('platform')}
                  onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode('platform')}
                  onBlur={() => setActiveNode(null)}
                  className={`text-center w-full p-6 rounded-2xl border-2 transition-all duration-300 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                    activeNode === 'platform'
                      ? 'bg-signal text-paper border-signal shadow-lg'
                      : 'bg-paper border-signal/40 shadow-md'
                  }`}
                >
                  <div className={`font-display font-medium text-xl mb-2 ${activeNode === 'platform' ? 'text-paper' : 'text-ink'}`}>
                    {node.label}
                  </div>
                  <div className={`text-sm leading-relaxed transition-colors ${activeNode === 'platform' ? 'text-paper/80' : 'text-muted'}`}>
                    {node.description}
                  </div>
                </motion.button>
              );
            })()}

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="hidden md:flex flex-col items-center gap-2 text-muted/30"
            >
              <div className="h-8 w-px bg-muted/20" />
            </motion.div>
          </div>

          {/* Column 3: Instructor */}
          {(() => {
            const node = nodes.find(n => n.key === 'instructor')!;
            return (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                onMouseEnter={() => setActiveNode('instructor')}
                onMouseLeave={() => setActiveNode(null)}
                onFocus={() => setActiveNode('instructor')}
                onBlur={() => setActiveNode(null)}
                className={`text-left w-full p-6 rounded-2xl border transition-all duration-300 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                  isDimmed('instructor')
                    ? 'bg-paper border-muted/10 opacity-40'
                    : activeNode === 'instructor'
                    ? 'bg-ink text-paper border-ink shadow-lg'
                    : 'bg-paper border-muted/20 shadow-sm'
                }`}
              >
                <div className={`font-display font-medium text-xl mb-2 ${activeNode === 'instructor' ? 'text-paper' : 'text-ink'}`}>
                  {node.label}
                </div>
                <div className={`text-sm leading-relaxed transition-colors ${activeNode === 'instructor' ? 'text-paper/80' : 'text-muted'}`}>
                  {node.description}
                </div>
              </motion.button>
            );
          })()}
        </div>

        {/* Active node description on mobile (shown below) */}
        <motion.div
          animate={{ opacity: activeNode ? 1 : 0, y: activeNode ? 0 : 8 }}
          className="mt-8 text-center text-signal text-sm font-medium md:hidden"
        >
          {activeNode && `${nodes.find(n => n.key === activeNode)?.label} connects to: ${nodes.find(n => n.key === activeNode)?.connects.map(c => nodes.find(n => n.key === c)?.label).join(', ')}`}
        </motion.div>
      </div>
    </section>
  );
};

export default EcosystemSection;
