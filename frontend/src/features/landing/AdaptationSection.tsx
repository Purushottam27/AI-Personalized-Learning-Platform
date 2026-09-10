import React from 'react';
import { motion } from 'framer-motion';

const AdaptationSection: React.FC = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6 overflow-hidden">
      <div className="text-center mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-signal font-semibold tracking-wider text-sm mb-4"
        >
          THE ADAPTATION MOMENT
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl md:text-5xl mb-6 text-ink"
        >
          Your path changes when you do.
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-muted max-w-2xl mx-auto"
        >
          Instead of moving everyone forward, the platform responds to what you need.
        </motion.p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* The visual flow */}
        <div className="flex flex-col items-center">
          
          {/* START */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center z-10"
          >
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Start</div>
            <div className="bg-paper border-2 border-muted/20 px-6 py-3 rounded-full font-medium shadow-sm text-ink">
              Database Systems
            </div>
          </motion.div>

          <motion.div 
            initial={{ height: 0 }}
            whileInView={{ height: 40 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="w-0.5 bg-muted/30"
          />

          {/* ASSESS */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center z-10"
          >
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Assess</div>
            <div className="bg-surface border border-muted/10 px-6 py-3 rounded-lg font-medium text-ink shadow-sm">
              Performance
            </div>
          </motion.div>

          <motion.div 
            initial={{ height: 0 }}
            whileInView={{ height: 40 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="w-0.5 bg-muted/30"
          />

          {/* RESULT */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 }}
            className="flex flex-col items-center bg-white/50 border border-muted/20 p-4 rounded-xl shadow-sm z-10 w-56"
          >
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Result</div>
            <div className="flex justify-between w-full text-sm mb-1">
              <span className="text-ink">Entity-Relationship</span> <span className="text-sage">✓</span>
            </div>
            <div className="flex justify-between w-full text-sm mb-1">
              <span className="text-ink">Transactions</span> <span className="text-sage">✓</span>
            </div>
            <div className="flex justify-between w-full text-sm font-medium">
              <span className="text-ink">Normalization</span> <span className="text-signal">⚠</span>
            </div>
          </motion.div>

          {/* Branching */}
          <div className="flex w-full max-w-md justify-between mt-0 relative h-32">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* General Path */}
              <motion.path 
                d="M 50,0 C 50,50 20,50 20,100"
                fill="transparent"
                stroke="var(--color-muted)"
                strokeOpacity="0.3"
                strokeWidth="0.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              {/* Personalized Path */}
              <motion.path 
                d="M 50,0 C 50,50 80,50 80,100"
                fill="transparent"
                stroke="var(--color-signal)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.3 }}
              />
            </svg>
          </div>

          <div className="flex w-full max-w-2xl justify-between px-4 z-10">
            {/* General Path Endpoint */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 0.5, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.8 }}
              className="flex flex-col items-center w-48 text-center"
            >
              <div className="bg-surface border border-muted/20 p-4 rounded-xl text-ink font-medium shadow-sm mb-2 w-full">
                Advanced Indexing
              </div>
              <div className="text-xs text-muted">For other learners</div>
            </motion.div>

            {/* Personalized Path Endpoint */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 2.0 }}
              className="flex flex-col items-center w-48 text-center relative"
            >
              <div className="bg-signal text-paper p-4 rounded-xl font-medium shadow-md mb-2 w-full">
                Normalization Practice
              </div>
              <div className="text-xs font-bold text-signal">For you</div>

              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 2.5 }}
                className="absolute top-0 -right-48 w-40 text-left hidden md:block"
              >
                <div className="font-display italic text-sm text-signal">Different learners. Different next steps.</div>
                <svg className="w-8 h-8 mt-1 text-signal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AdaptationSection;
