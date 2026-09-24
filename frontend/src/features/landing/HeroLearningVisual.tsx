import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";

interface HeroLearningVisualProps {
  mousePosition: {
    x: number;
    y: number;
  };
  isTouchDevice: boolean;
}

const HeroLearningVisual: React.FC<HeroLearningVisualProps> = ({
  mousePosition,
  isTouchDevice,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const parallax = (strength: number) => ({
    x: isTouchDevice || prefersReducedMotion ? 0 : mousePosition.x * strength,
    y: isTouchDevice || prefersReducedMotion ? 0 : mousePosition.y * strength,
  });

  return (
    <div
  className="
    relative
    w-full
    aspect-square
    max-w-140
    mx-auto

    min-[480px]:max-w-130
    max-[479px]:max-w-97.5

    lg:max-w-130
    xl:max-w-137.5
    2xl:max-w-145
  "
>
      {/* Soft ambient background */}
      <div
        className="
          absolute
          inset-[16%]
          rounded-full
          bg-signal-soft/40
          blur-3xl
        "
        aria-hidden="true"
      />

      {/* =========================================================
          CONNECTION ARROWS
          Same geometry at every breakpoint.
          The SVG scales with the container.
          ========================================================= */}

      <svg
        viewBox="0 0 560 560"
        preserveAspectRatio="xMidYMid meet"
        className="
          absolute
          inset-0
          w-full
          h-full
          pointer-events-none
          z-10
        "
        aria-hidden="true"
      >
        <defs>
          <marker
            id="arrow-signal"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10"
              fill="none"
              stroke="var(--color-signal)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>

          <marker
            id="arrow-sage"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10"
              fill="none"
              stroke="var(--color-sage)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {/* Current Level */}
        <motion.path
          d="M 238 232 C 215 205, 192 185, 168 165"
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-signal)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              duration: 0.8,
              delay: 0.7,
              ease: "easeOut",
            },
            opacity: {
              duration: 0.2,
              delay: 0.7,
            },
          }}
        />

        {/* Focus Area */}
        <motion.path
          d="M 322 232 C 345 205, 368 185, 392 165"
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-signal)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              duration: 0.8,
              delay: 0.9,
              ease: "easeOut",
            },
            opacity: {
              duration: 0.2,
              delay: 0.9,
            },
          }}
        />

        {/* Progress */}
        <motion.path
          d="M 238 328 C 215 355, 192 375, 168 395"
          fill="none"
          stroke="var(--color-sage)"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-sage)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              duration: 0.8,
              delay: 1.1,
              ease: "easeOut",
            },
            opacity: {
              duration: 0.2,
              delay: 1.1,
            },
          }}
        />

        {/* Recommended Next */}
        <motion.path
          d="M 322 328 C 345 355, 368 375, 392 395"
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-signal)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              duration: 0.8,
              delay: 1.3,
              ease: "easeOut",
            },
            opacity: {
              duration: 0.2,
              delay: 1.3,
            },
          }}
        />
      </svg>

      {/* =========================================================
          CENTER LEARNER
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          scale: prefersReducedMotion ? 1 : 0.88,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.7,
          delay: 0.3,
        }}
        style={parallax(10)}
        className="
          absolute
          left-1/2
          top-1/2
          -translate-x-1/2
          -translate-y-1/2
          z-20

          w-[36%]
          min-[480px]:w-[38%]
          sm:w-[42%]

          aspect-square
          rounded-full
          bg-surface-elevated
          border
          border-border
          shadow-lg

          flex
          flex-col
          items-center
          justify-center
          text-center

          px-2
          sm:px-4
        "
      >
        <div
          className="
            flex
            h-7
            w-7
            sm:h-12
            sm:w-12
            items-center
            justify-center
            rounded-full
            bg-signal-soft

            mb-1
            sm:mb-3
          "
        >
          <UserRound
            className="
              h-4
              w-4
              sm:h-6
              sm:w-6
              text-signal
            "
            strokeWidth={1.7}
          />
        </div>

        <h3
          className="
            font-display
            text-base
            sm:text-3xl
            md:text-4xl
            text-text-primary
          "
        >
          Learner
        </h3>

        <p
          className="
            mt-1
            sm:mt-2
            text-[9px]
            sm:text-sm
            md:text-base
            text-text-secondary
            leading-relaxed
          "
        >
          Unique goals.
          <br />
          Real progress.
        </p>
      </motion.div>

      {/* =========================================================
          CURRENT LEVEL
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.6,
          duration: 0.5,
        }}
        style={parallax(-7)}
        className="
  absolute
  top-[2%]
  md:top-[8%]
  left-[3%]
  min-[480px]:left-[4%]
  sm:left-[0%]

  z-30

  w-[36%]
  min-[480px]:w-[36%]
  sm:w-[40%]

  rounded-lg
  sm:rounded-2xl

  border
  border-border
  bg-surface-elevated
  shadow-md

 p-1.5
min-[405px]:p-2
sm:p-4
"
      >
        <div className="flex items-start gap-1.5 sm:gap-3">
          <div
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-signal-soft

              sm:h-8
              sm:w-8
            "
          >
            <BarChart3
              className="
                h-3
                w-3
                sm:h-4
                sm:w-4
                text-signal
              "
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-[7px]
min-[480px]:text-[8px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-text-tertiary
              "
            >
              Current Level
            </p>

            <p
              className="
                    mt-0.5
    sm:mt-1
    font-display

    text-[9px]
    min-[405px]:text-[10px]
    sm:text-base
    md:text-lg

    text-text-primary
    truncate
              "
            >
              Intermediate
            </p>

            <p
              className="
    mt-1
    text-[8px]
    min-[480px]:text-[9px]
    sm:text-xs
    text-text-secondary
    leading-relaxed

    max-[404px]:hidden
    md:hidden
  "
            >
              <span className="sm:hidden">Building momentum.</span>

              <span className="hidden sm:inline">
                Building momentum with consistency.
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          FOCUS AREA
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.8,
          duration: 0.5,
        }}
        style={parallax(7)}
        className="
  absolute
  top-[2%]
  md:top-[8%]

  right-[3%]
  min-[480px]:right-[4%]
  sm:right-[-2%]

  z-30

  w-[36%]
  min-[480px]:w-[36%]
  sm:w-[40%]

  rounded-lg
  sm:rounded-2xl

  border
  border-border
  bg-surface-elevated
  shadow-md

  p-2
  min-[480px]:p-2.5
  sm:p-4
"
      >
        <div className="flex items-start gap-1.5 sm:gap-3">
          <div
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-signal-soft

              sm:h-8
              sm:w-8
            "
          >
            <BookOpen
              className="
                h-3
                w-3
                sm:h-4
                sm:w-4
                text-signal
              "
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-[7px]
min-[480px]:text-[8px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-text-tertiary
              "
            >
              Focus Area
            </p>

            <p
              className="
                mt-0.5
    sm:mt-1
    font-display

    text-[9px]
    min-[405px]:text-[10px]
    sm:text-sm
    md:text-base

    text-text-primary
    leading-tight
              "
            >
              Data Structures
            </p>

            <p
              className="
                mt-1
                text-[8px]
min-[480px]:text-[9px]
                sm:text-xs
                text-text-secondary
                leading-relaxed
                max-[404px]:hidden
                md:hidden
              "
            >
              <span className="sm:hidden">Strengthening core skills.</span>

              <span className="hidden sm:inline">
                Strengthening core problem-solving skills.
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          PROGRESS
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1,
          duration: 0.5,
        }}
        style={parallax(-6)}
        className="
  absolute

  bottom-[4.5%]
  md:bottom-[10%]

  left-[4%]
  min-[480px]:left-[5%]
  sm:left-[2%]

  z-30

  w-[36%]
  min-[480px]:w-[36%]
  sm:w-[40%]

  rounded-lg
  sm:rounded-2xl

  border
  border-border
  bg-surface-elevated
  shadow-md

  p-2
  min-[480px]:p-2.5
  sm:p-4
"
      >
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-sage-soft

              sm:h-8
              sm:w-8
            "
          >
            <TrendingUp
              className="
                h-3
                w-3
                sm:h-4
                sm:w-4
                text-sage
              "
            />
          </div>

          <div>
            <p
              className="
                text-[7px]
min-[480px]:text-[8px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-text-tertiary
              "
            >
              Progress
            </p>

            <p
              className="
                mt-0.5
                sm:mt-1
                font-display
                text-xl
                sm:text-3xl
                font-bold
                text-sage
              "
            >
              72%
            </p>

            <p
              className="
                hidden
                sm:block
                md:hidden
                text-xs
                text-text-secondary
                mt-1
              "
            >
              Real progress.
            </p>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          RECOMMENDED NEXT
          NOTE: `md:` overrides below (768–1023px) exist only to give
          this card extra breathing room from the annotation arrow in
          that "mid device" tablet range, where the container hits its
          largest non-desktop width. `lg:` resets it back to the sm:
          values once the desktop layout (with more room) kicks in.
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.2,
          duration: 0.5,
        }}
        style={parallax(7)}
        className="
  absolute

  bottom-[2.5%]
  md:bottom-[9%]

  right-[3%]
  min-[480px]:right-[4%]
  sm:right-[0%]
  md:right-[5%]
  lg:right-[0%]

  z-30

  w-[36%]
  min-[480px]:w-[36%]
  sm:w-[40%]

  rounded-lg
  sm:rounded-2xl

  border
  border-border
  border-l-2
  sm:border-l-4
  border-l-signal

  bg-surface-elevated
  shadow-md

  p-2
  min-[480px]:p-2.5
  sm:p-4
"
      >
        <div className="flex items-start gap-1.5 sm:gap-3">
          <div
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-signal-soft

              sm:h-8
              sm:w-8
            "
          >
            <Target
              className="
                h-3
                w-3
                sm:h-4
                sm:w-4
                text-signal
              "
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-[7px]
min-[480px]:text-[8px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-text-tertiary
              "
            >
              Recommended Next
            </p>

            <p
              className="
                mt-0.5
    sm:mt-1
    font-display

    text-[8px]
    min-[405px]:text-[9px]
    sm:text-xs
    md:text-sm

    text-text-primary
    leading-tight
    truncate
              "
            >
              Practice <span className="text-signal">→</span> Arrays
            </p>

            <p
              className="
                mt-1
                text-[8px]
min-[480px]:text-[9px]
                sm:text-xs
                text-text-secondary
                leading-relaxed
                max-[404px]:hidden
                md:hidden
              "
            >
              <span className="sm:hidden">Focus on what matters.</span>

              <span className="hidden sm:inline">
                Focus on what matters right now.
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          EDITORIAL ANNOTATION
          NOTE: the `md:` override (768–1023px) pulls this in from the
          Recommended Next card in that same tablet window, and `lg:`
          resets it once desktop's larger container gives room back.
          ========================================================= */}

      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 1.8,
          duration: 0.5,
        }}
        style={parallax(-8)}
        className="
          absolute

          top-[41%]
          right-[-1%]

          sm:right-[-3%]
          md:right-[-7%]
          lg:right-[-3%]

          z-30
          text-signal

          max-w-[23%]
          sm:max-w-none
        "
      >
        <p
          className="
            font-display
            italic

            text-[8px]
            leading-tight

            sm:text-sm
            sm:leading-relaxed
          "
        >
          A learning path
          <br />
          that adapts to you.
        </p>

        {/* Arrow pointing toward Learner */}
        <svg
          viewBox="0 0 70 40"
          className="
            w-8
            h-5

            sm:w-14
            sm:h-8

            ml-[-2px]
            sm:ml-[-4px]

            mt-0
            sm:mt-1
          "
          aria-hidden="true"
        >
          <defs>
            <marker
              id="annotation-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path
                d="M 0 0 L 10 5 L 0 10"
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          <path
            d="M 62 5 C 58 18, 42 29, 14 31"
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth="1.5"
            strokeLinecap="round"
            markerEnd="url(#annotation-arrow)"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default HeroLearningVisual;