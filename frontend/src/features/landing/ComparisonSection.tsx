import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, CornerDownRight } from 'lucide-react';

const ComparisonSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-surface/30 border-y border-muted/10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-signal font-semibold tracking-wider text-sm mb-4"
          >
            A DIFFERENT WAY TO LEARN
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-6 text-ink"
          >
            Not everyone learns the same way.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted max-w-2xl mx-auto"
          >
            Traditional platforms give the same path to everyone. Learnova adapts to you — because your learning journey is unique.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 max-w-4xl mx-auto relative">
          
          {/* Traditional Path */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center"
          >
            <h3 className="font-display font-medium text-xl mb-12 text-muted">Traditional Learning</h3>
            
            <div className="flex flex-col items-center w-full max-w-[200px] space-y-4">
              {['Lesson 1', 'Lesson 2', 'Lesson 3', 'Lesson 4', 'Lesson 5'].map((lesson, idx) => (
                <React.Fragment key={lesson}>
                  <div className="w-full bg-white/50 border border-muted/20 p-4 rounded-lg text-center text-muted font-medium">
                    {lesson}
                  </div>
                  {idx < 4 && <ArrowDown className="text-muted/30" />}
                </React.Fragment>
              ))}
            </div>
            
            <div className="mt-8 text-center text-muted text-sm italic border-t border-muted/20 pt-4 w-full max-w-[200px]">
              Same path for everyone.
            </div>
          </motion.div>

          {/* Adaptive Path */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center relative"
          >
            <h3 className="font-display font-medium text-xl mb-12 text-ink">Adaptive Learning</h3>
            
            <div className="flex flex-col w-full max-w-[280px]">
              <motion.div className="w-full bg-paper border border-signal/20 p-4 rounded-lg text-center text-ink font-medium shadow-sm mb-4">
                Learn
              </motion.div>
              <div className="flex justify-center mb-4"><ArrowDown className="text-signal/50" /></div>
              
              <motion.div className="w-full bg-paper border border-signal/20 p-4 rounded-lg text-center text-ink font-medium shadow-sm mb-4">
                Practice
              </motion.div>
              <div className="flex justify-center mb-4"><ArrowDown className="text-signal/50" /></div>
              
              <motion.div className="w-full bg-paper border border-signal/20 p-4 rounded-lg text-center text-ink font-medium shadow-sm mb-4">
                Measure
              </motion.div>
              <div className="flex justify-center mb-4"><ArrowDown className="text-signal/50" /></div>
              
              <motion.div className="w-full bg-paper border border-signal/20 p-4 rounded-lg text-center text-ink font-medium shadow-sm mb-4">
                Understand
              </motion.div>
              <div className="flex justify-center mb-4"><ArrowDown className="text-signal/50" /></div>
              
              <div className="flex items-start ml-1/2">
                <div className="h-full border-l-2 border-dashed border-signal/40 -ml-px flex items-end pb-6 pt-2">
                  <CornerDownRight className="text-signal/60 mb-[-12px]" />
                </div>
                <div className="pl-4 pt-8 w-full">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="w-full bg-signal text-paper p-4 rounded-lg text-center font-medium shadow-md"
                  >
                    Targeted Next Step
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-signal text-sm italic font-medium pt-4 w-full max-w-[280px]">
              Your performance changes what comes next.
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
