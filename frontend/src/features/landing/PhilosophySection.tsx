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
    <section className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-signal font-semibold tracking-wider text-sm mb-4"
            >
              THE PHILOSOPHY
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl mb-6 text-text-primary"
            >
              Learning should respond to the learner.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-text-secondary max-w-xl"
            >
              A personalized learning system should not treat every learner
              the same. It should observe progress, understand performance,
              and adapt the next step accordingly.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="border-l-2 border-signal pl-6 md:pl-8">
              <p className="font-display text-2xl md:text-3xl leading-relaxed text-text-primary">
                “The goal is not to give everyone the same path.
                <br />
                The goal is to help every learner find the next right step.”
              </p>

              <div className="mt-6 text-sm text-text-tertiary">
                Adaptive learning principle
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative mt-20">
        {/* Horizontal connecting line (desktop) */}
        <div
          aria-hidden="true"
          className="absolute top-6 left-0 right-0 h-px  hidden md:block pointer-events-none"
        />

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
                  transition={{
                    delay: 0.2 + 0.1 * i,
                    type: 'spring',
                  }}
                  className="w-3 h-3 rounded-full bg-signal shrink-0"
                  aria-hidden="true"
                />

                {/* Connector between dots */}
                {i < pillars.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.3 + 0.1 * i,
                      duration: 0.5,
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="hidden md:block flex-1 h-px bg-signal/20"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="text-xs font-bold text-signal tracking-widest mb-3 uppercase">
                {String(i + 1).padStart(2, '0')} — {pillar.label}
              </div>

              <h3 className="font-display text-2xl text-text-primary mb-3 group-hover:-translate-y-0.5 transition-transform duration-300">
                {pillar.headline}
              </h3>

              <p className="text-text-secondary text-[15px] leading-relaxed">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
};

export default PhilosophySection;