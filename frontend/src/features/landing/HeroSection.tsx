import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MoveRight, CornerRightDown } from 'lucide-react';
import HeroLearningVisual from './HeroLearningVisual';

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
            className="font-display text-5xl md:text-6xl lg:text-7xl leading-tight mb-8 text-text-primary"
          >
            Learning that adapts to you.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-text-secondary leading-relaxed mb-10 max-w-lg"
          >
            Learn at your level, practice what matters, understand where you
            need to improve, and follow a learning experience that adapts as
            you progress.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 bg-signal text-paper px-6 py-3 rounded-full hover:bg-signal-hover active:bg-signal-active transition-all font-medium text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start learning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-surface text-text-primary px-6 py-3 rounded-full border border-border hover:bg-surface-elevated active:bg-surface-disabled transition-all font-medium text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              See How It Works
            </a>
          </motion.div>
        </div>

        {/* Visual Content */}
        <div className="relative w-full">
          <HeroLearningVisual
            mousePosition={mousePosition}
            isTouchDevice={isTouchDevice}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;