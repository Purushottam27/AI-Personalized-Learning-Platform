import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MoveRight, CornerRightDown } from 'lucide-react';

// Module-level constant: evaluated once at load, never changes during session
const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const HeroSection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const isTouchDevice = IS_TOUCH_DEVICE;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouchDevice || prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  return (
    <section 
      className="min-h-[85vh] flex flex-col justify-center max-w-6xl mx-auto px-6 pt-12 pb-24 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        {/* Text Content */}
        <div className="z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-signal font-semibold tracking-wider text-sm mb-6"
          >
            PERSONALIZED LEARNING
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-6xl lg:text-7xl leading-tight mb-8 text-ink"
          >
            Learning that adapts to you.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted leading-relaxed mb-10 max-w-lg"
          >
            Learn at your level, practice what matters, understand where you need to improve, and follow a learning experience that adapts as you progress.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a 
              href="/signup" 
              className="group inline-flex items-center justify-center gap-2 bg-signal text-paper px-6 py-3 rounded-full hover:bg-signal/90 active:bg-signal/80 transition-all font-medium text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
            >
              Start learning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#how-it-works" 
              className="inline-flex items-center justify-center gap-2 bg-surface text-ink px-6 py-3 rounded-full hover:bg-surface/80 active:bg-surface/70 transition-all font-medium text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2"
            >
              See How It Works
            </a>
          </motion.div>
        </div>

        {/* Visual Content */}
        <div className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-full h-full relative"
            style={{
              x: isTouchDevice ? 0 : mousePosition.x * 20,
              y: isTouchDevice ? 0 : mousePosition.y * 20
            }}
          >
            {/* Base Circles */}
            <div className="absolute inset-0 m-auto w-[70%] h-[70%] border border-muted/20 rounded-full flex items-center justify-center">
              <div className="w-[75%] h-[75%] border border-muted/30 rounded-full flex items-center justify-center">
                <div className="w-[70%] h-[70%] border border-muted/40 rounded-full bg-surface/50 backdrop-blur-sm flex flex-col items-center justify-center shadow-sm">
                  <span className="font-display font-medium text-xl text-ink">You</span>
                </div>
              </div>
            </div>

            {/* Path visualization */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <motion.path 
                d="M 20,50 C 30,30 70,30 80,50"
                fill="transparent"
                stroke="var(--color-signal)"
                strokeWidth="0.5"
                strokeDasharray="1 1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1.4, ease: "easeInOut" }}
              />
              <motion.path 
                d="M 80,50 C 90,60 70,80 50,80"
                fill="transparent"
                stroke="var(--color-sage)"
                strokeWidth="0.5"
                strokeDasharray="1 1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 2.9, ease: "easeInOut" }}
              />
            </svg>

            {/* Nodes around the circle using percentages for responsiveness */}
            <motion.div 
              initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: prefersReducedMotion ? 0 : 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="absolute top-[15%] left-[5%] bg-paper shadow-md border border-muted/10 rounded-xl p-3 flex flex-col gap-1 min-w-[120px] max-w-[140px] z-10"
              style={{ x: isTouchDevice ? 0 : mousePosition.x * -10, y: isTouchDevice ? 0 : mousePosition.y * -10 }}
            >
              <span className="text-[9px] sm:text-[10px] text-muted font-bold uppercase tracking-wide">Current Level</span>
              <span className="text-xs sm:text-sm font-medium">Intermediate</span>
            </motion.div>

            <motion.div 
              initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: prefersReducedMotion ? 0 : 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="absolute top-[10%] right-[5%] bg-paper shadow-md border border-muted/10 rounded-xl p-3 flex flex-col gap-1 min-w-[120px] max-w-[140px] z-10"
              style={{ x: isTouchDevice ? 0 : mousePosition.x * 15, y: isTouchDevice ? 0 : mousePosition.y * 15 }}
            >
              <span className="text-[9px] sm:text-[10px] text-muted font-bold uppercase tracking-wide">Focus Area</span>
              <span className="text-xs sm:text-sm font-medium">Data Structures</span>
            </motion.div>

            <motion.div 
              initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: prefersReducedMotion ? 0 : 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, type: "spring" }}
              className="absolute bottom-[20%] left-[0%] bg-paper shadow-md border border-muted/10 rounded-xl p-3 flex flex-col gap-1 min-w-[100px] z-10"
              style={{ x: isTouchDevice ? 0 : mousePosition.x * -5, y: isTouchDevice ? 0 : mousePosition.y * -5 }}
            >
              <span className="text-[9px] sm:text-[10px] text-muted font-bold uppercase tracking-wide">Progress</span>
              <span className="text-lg sm:text-xl font-display font-bold text-sage">72%</span>
            </motion.div>

            <motion.div 
              initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: prefersReducedMotion ? 0 : 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="absolute bottom-[20%] right-[-5%] bg-paper shadow-md border border-muted/10 rounded-xl p-3 sm:p-4 flex flex-col gap-1 min-w-[140px] max-w-[180px] border-l-4 border-l-signal z-10"
              style={{ x: isTouchDevice ? 0 : mousePosition.x * 10, y: isTouchDevice ? 0 : mousePosition.y * 10 }}
            >
              <span className="text-[9px] sm:text-[10px] text-muted font-bold uppercase tracking-wide">Recommended Next</span>
              <span className="text-xs sm:text-sm font-medium flex items-center gap-1 flex-wrap">
                Practice <MoveRight className="w-3 h-3 text-signal shrink-0" /> Arrays
              </span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="absolute top-[40%] right-[5%] sm:right-[15%] rotate-6 text-signal hidden sm:block"
              style={{ x: isTouchDevice ? 0 : mousePosition.x * -20, y: isTouchDevice ? 0 : mousePosition.y * -20 }}
            >
              <div className="font-display italic text-sm">A learning path<br/>that adapts to you.</div>
              <CornerRightDown className="w-5 h-5 ml-4 mt-1" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
