import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

const EvidenceSection: React.FC = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1 relative">
          <div className="relative mx-auto w-full max-w-md">
            {/* Visual Flow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-surface/50 border border-border-muted rounded-2xl p-6 mb-4 shadow-sm"
            >
              <div className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
                Recent Performance
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-border-muted">
                  <span className="text-sm text-text-primary">
                    Process Scheduling
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    8/10
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border-muted">
                  <span className="text-sm font-medium text-text-primary">
                    Virtual Memory
                  </span>
                  <span className="text-sm font-bold text-signal">
                    3/10
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border-muted">
                  <span className="text-sm text-text-primary">
                    File Systems
                  </span>
                  <span className="text-sm font-medium text-sage">
                    9/10
                  </span>
                </div>

                <div className="text-xs text-text-tertiary pt-1">
                  More topics ...
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: 40, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="w-0.5 bg-border-muted mx-auto relative"
            >
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-2 -left-[11px] text-text-tertiary"
              >
                <ArrowDown size={24} aria-hidden="true" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="bg-surface border-2 border-border rounded-xl p-4 text-center my-4 relative z-10"
            >
              <div className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">
                Learning Signal
              </div>

              <div className="font-medium text-text-primary">
                Virtual Memory needs reinforcement.
              </div>
            </motion.div>

            <motion.div
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: 40, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="w-0.5 bg-signal/40 mx-auto relative"
            >
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.0 }}
                className="absolute -bottom-2 -left-[11px] text-signal"
              >
                <ArrowDown size={24} aria-hidden="true" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.1 }}
              className="bg-signal text-paper rounded-xl p-5 text-center my-4 shadow-lg"
            >
              <div className="text-xs font-bold text-paper uppercase tracking-wider mb-2">
                Next Best Action
              </div>

              <div className="font-medium">
                Targeted paging practice →
              </div>
            </motion.div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-signal font-semibold tracking-wider text-sm mb-4"
          >
            LEARNING LEAVES EVIDENCE
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-6 text-text-primary"
          >
            Every attempt tells us something.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-secondary"
          >
            Your practice, assessments, and response patterns create a
            learning profile. The platform uses this evidence to understand
            what you know and recommend what to do next.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default EvidenceSection;