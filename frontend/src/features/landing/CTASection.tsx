import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-32 max-w-5xl mx-auto px-6">
      <div className="relative overflow-hidden">
        {/* Subtle background motif */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <svg
            className="absolute bottom-0 left-0 w-full h-full opacity-5 text-signal"
            viewBox="0 0 600 300"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            <motion.path
              d="M 0,200 C 80,100 200,160 300,120 C 400,80 500,140 600,80"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 2, ease: 'easeInOut' }}
            />
            <motion.path
              d="M 0,240 C 100,180 220,220 300,180 C 380,140 480,190 600,140"
              stroke="currentColor"
              strokeWidth="0.8"
              fill="none"
              strokeDasharray="4 8"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 2.5, delay: 0.3, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Path motif icon */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-10"
          >
            <svg
              className="w-14 h-14 text-signal"
              viewBox="0 0 56 56"
              fill="none"
              aria-hidden="true"
            >
              <motion.path
                d="M8,44 C16,32 28,40 36,28 C44,16 48,22 50,14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: prefersReducedMotion ? 0 : 1.2, delay: 0.2, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="50" cy="14" r="4"
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 1.4 }}
              />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-signal font-semibold tracking-wider text-sm mb-6"
          >
            YOUR PERSONAL LEARNING PATH AWAITS
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl mb-6 text-ink leading-tight"
          >
            Start where you are.<br />
            <span className="text-ink/60">Arrive where you want to be.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted max-w-xl mx-auto mb-12 leading-relaxed"
          >
            Every learner's path is unique. Stop following someone else's curriculum. Build yours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 bg-ink text-paper px-8 py-4 rounded-full hover:bg-ink/90 active:bg-ink/80 transition-all font-medium text-lg shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Create your learning profile
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-ink border border-muted/30 px-8 py-4 rounded-full hover:border-ink/50 hover:bg-surface/50 active:bg-surface/70 transition-all font-medium text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Sign in
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
