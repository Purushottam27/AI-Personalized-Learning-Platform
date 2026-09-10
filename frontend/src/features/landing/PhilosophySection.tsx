import React from 'react';
import { motion } from 'framer-motion';

const PhilosophySection: React.FC = () => {
  const pillars = [
    {
      label: 'Understand',
      headline: 'Know exactly where you stand.',
      body: 'Your practice and assessment results reveal a precise picture of what you have mastered and what still needs work — no guessing, no assumptions.',
    },
    {
      label: 'Focus',
      headline: 'Work on what actually matters.',
      body: 'The platform identifies your highest-leverage opportunity, so every study session is targeted rather than random. Less time wasted. More ground covered.',
    },
    {
      label: 'Improve',
      headline: 'Make measurable, sustained progress.',
      body: 'Evidence of improvement updates your profile in real time, confirming progress and steering the next intervention before you drift backward.',
    },
  ];

  return (
    <section className="py-32 max-w-5xl mx-auto px-6">
      {/* Editorial eyebrow + headline */}
      <div className="mb-20 md:mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-signal font-semibold tracking-wider text-sm mb-6"
        >
          LESS GUESSING. MORE PROGRESS.
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-end">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl text-ink leading-none"
          >
            Learn deeper.<br />
            <span className="text-ink/60">Go further.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted leading-relaxed"
          >
            Effective learning isn't about more content — it's about the right content at the right moment. That's what evidence-driven personalization makes possible.
          </motion.p>
        </div>
      </div>

      {/* Three pillars with connective thread */}
      <div className="relative">
        {/* Horizontal connecting line (desktop) */}
        <div className="absolute top-6 left-0 right-0 h-px bg-muted/10 hidden md:block pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="group flex flex-col"
            >
              {/* Node dot on the thread line */}
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + 0.1 * i, type: 'spring' }}
                  className="w-3 h-3 rounded-full bg-signal shrink-0"
                />
                {/* Connector between dots (desktop only, not after last) */}
                {i < pillars.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + 0.1 * i, duration: 0.5 }}
                    style={{ transformOrigin: 'left' }}
                    className="hidden md:block flex-1 h-px bg-signal/20"
                  />
                )}
              </div>
              <div className="text-xs font-bold text-signal tracking-widest mb-3 uppercase">
                {String(i + 1).padStart(2, '0')} — {pillar.label}
              </div>
              <div className="font-display text-2xl text-ink mb-3 group-hover:-translate-y-0.5 transition-transform duration-300">
                {pillar.headline}
              </div>
              <p className="text-muted text-[15px] leading-relaxed">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;
