import React from 'react';
import { motion } from 'framer-motion';
import { MoveRight } from 'lucide-react';

const ProfileSection: React.FC = () => {
  return (
    <section id="for-learners" className="py-24 bg-surface/30 border-y border-muted/10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-signal font-semibold tracking-wider text-sm mb-4"
            >
              YOUR LEARNING PROFILE
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl mb-2"
            >
              It's not a form.
            </motion.h2>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="font-display text-4xl md:text-5xl mb-6 text-ink/70"
            >
              It evolves.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-lg text-muted max-w-md"
            >
              As you learn, your profile gets richer and more accurate, helping you focus on what truly matters to your progress.
            </motion.p>
          </div>

          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-paper border border-muted/20 rounded-2xl p-8 shadow-sm flex flex-col gap-6 hover:shadow-md transition-shadow duration-500"
            >
              <div className="border-b border-muted/10 pb-4">
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Current Focus</div>
                <div className="text-lg font-medium text-ink flex justify-between items-end">
                  Database Management Systems
                  <span className="text-xs text-sage px-2 py-1 bg-sage/10 rounded-full font-medium">Intermediate</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 border-b border-muted/10 pb-4">
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Strong Areas</div>
                  <div className="text-sm font-medium text-ink leading-relaxed">
                    Entity-Relationship<br/>
                    Transactions
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Developing Areas</div>
                  <div className="text-sm font-medium text-ink leading-relaxed opacity-80">
                    Normalization<br/>
                    Indexing Strategies
                  </div>
                </div>
              </div>

              <div className="border-b border-muted/10 pb-4">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Progress Over Time</div>
                  <div className="text-xs text-muted">Last 30 days</div>
                </div>
                {/* Elegant bar graph representation */}
                <div className="h-16 w-full flex items-end gap-[2px] mt-2 group cursor-default">
                  {[30, 45, 40, 60, 55, 75, 70, 85, 90, 95].map((h, i) => (
                    <motion.div 
                      key={i} 
                      className="bg-sage/40 hover:bg-sage/70 rounded-t-[1px] flex-1 transition-colors"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + (i * 0.05), duration: 0.5 }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Recommended Next Step</div>
                <a href="#" className="inline-flex items-center gap-2 text-signal font-medium text-sm hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm p-1 -ml-1">
                  Normalization practice <MoveRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProfileSection;
