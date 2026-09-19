import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Database,
  Layers3,
  TriangleAlert,
} from 'lucide-react';

const AdaptationSection: React.FC = () => {
  return (
    <section className="overflow-hidden bg-background py-24 border-b">
      <div className="mx-auto max-w-6xl px-6">
        {/* -------------------------------------------------------------
            SECTION HEADER
           ------------------------------------------------------------- */}

        <div className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-sm font-semibold tracking-wider text-signal"
          >
            THE ADAPTATION MOMENT
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 font-display text-4xl text-text-primary md:text-5xl"
          >
            Your path changes when you do.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-text-secondary"
          >
            Instead of moving everyone forward, the platform responds to what
            you need.
          </motion.p>
        </div>

        {/* -------------------------------------------------------------
            DIAGRAM
           ------------------------------------------------------------- */}

        <div className="mx-auto max-w-5xl">
          {/* ===========================================================
              CENTRAL FLOW
             =========================================================== */}

          <div className="flex flex-col items-center">
            {/* START */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-text-primary">
                Start
              </div>

              <div className="flex w-full max-w-[280px] items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-4 shadow-sm">
                <Database
                  className="h-7 w-7 shrink-0 text-text-primary"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />

                <div className="text-left">
                  <div className="font-medium text-text-primary">
                    Database Systems
                  </div>

                  <div className="text-sm text-text-tertiary">
                    (Topic)
                  </div>
                </div>
              </div>
            </motion.div>

            {/* START → ASSESS */}
            <div className="flex flex-col items-center py-3">
              <ArrowDown
                className="h-5 w-5 text-signal"
                aria-hidden="true"
              />

              <span className="my-1 text-xs font-bold uppercase tracking-[0.16em] text-text-primary">
                Assess
              </span>
            </div>

            {/* PERFORMANCE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex w-full max-w-60 items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-4 shadow-sm"
            >
              <BarChart3
                className="h-7 w-7 shrink-0 text-text-primary"
                strokeWidth={1.6}
                aria-hidden="true"
              />

              <div>
                <div className="font-medium text-text-primary">
                  Performance
                </div>

                <div className="text-sm text-text-tertiary">
                  (Assessment)
                </div>
              </div>
            </motion.div>

            {/* PERFORMANCE → RESULT */}
            <div className="py-3">
              <ArrowDown
                className="h-5 w-5 text-signal"
                aria-hidden="true"
              />
            </div>

            {/* RESULT */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex h-18.5 w-full max-w-60 items-center justify-center rounded-2xl border border-border bg-surface-elevated shadow-sm"
            >
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-text-primary">
                Result
              </span>
            </motion.div>
          </div>

          {/* ===========================================================
              BRANCHING AREA

              IMPORTANT:
              This starts AFTER the RESULT box.
              Therefore the learner-result connectors cannot overlap
              Performance → Result.
             =========================================================== */}

          <div className="relative mt-8 md:mt-2">
            {/* Desktop branch connectors */}
            <svg
              className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-[115px] w-full md:block"
              viewBox="0 0 1000 115"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Left branch */}
              <path
                d="M500 0 C500 48 305 48 180 108"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="7 7"
                className="text-text-tertiary"
              />

              {/* Right branch */}
              <path
                d="M500 0 C500 48 695 48 820 108"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="7 7"
                className="text-signal"
              />
            </svg>

            {/* ---------------------------------------------------------
                LEARNER RESULT CARDS
               --------------------------------------------------------- */}

            <div className="relative z-10 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
              {/* =======================================================
                  LEARNER A RESULT
                 ======================================================= */}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col items-center pt-0 md:pt-[76px]"
              >
                {/* Mobile branch indicator */}
                <div className="mb-4 flex flex-col items-center md:hidden">
                  <ArrowDown
                    className="h-5 w-5 text-text-tertiary"
                    aria-hidden="true"
                  />
                </div>

                <div className="w-full max-w-[320px] rounded-2xl border border-border bg-surface px-6 py-5 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Entity-Relationship
                      </span>

                      <Check
                        className="h-5 w-5 shrink-0 text-sage"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Transactions
                      </span>

                      <Check
                        className="h-5 w-5 shrink-0 text-sage"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Normalization
                      </span>

                      <Check
                        className="h-5 w-5 shrink-0 text-sage"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* =======================================================
                  CENTER MESSAGE
                 ======================================================= */}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.65 }}
                className="order-last flex items-center justify-center md:order-0 md:pt-29.5"
              >
                <div className="text-center">
                  <div className="font-display text-2xl italic text-signal">
                    Personalized learning
                  </div>

                  <div className="mt-2 font-display text-lg italic leading-7 text-text-secondary">
                    Different learners.
                    <br />
                    Different next steps.
                  </div>

                  {/* Mobile directional arrows */}
                  <div className="mt-5 flex items-center justify-center gap-6 md:hidden">
                    <ArrowLeft
                      className="h-6 w-6 text-signal"
                      aria-hidden="true"
                    />

                    <ArrowRight
                      className="h-6 w-6 text-signal"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </motion.div>

              {/* =======================================================
                  LEARNER B RESULT
                 ======================================================= */}

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col items-center pt-0 md:pt-[76px]"
              >
                {/* Mobile branch indicator */}
                <div className="mb-4 flex flex-col items-center md:hidden">
                  <ArrowDown
                    className="h-5 w-5 text-signal"
                    aria-hidden="true"
                  />
                </div>

                <div className="w-full max-w-[320px] rounded-2xl border border-signal/40 bg-signal-soft px-6 py-5 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Entity-Relationship
                      </span>

                      <Check
                        className="h-5 w-5 shrink-0 text-sage"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Transactions
                      </span>

                      <Check
                        className="h-5 w-5 shrink-0 text-sage"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-primary">
                        Normalization
                      </span>

                      <TriangleAlert
                        className="h-5 w-5 shrink-0 text-signal"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ===========================================================
                NEXT STEPS

                These are deliberately separated from the result cards.
               =========================================================== */}

            <div className="mt-8 grid grid-cols-1 gap-12 md:mt-0 md:grid-cols-3 md:gap-8">
              {/* LEARNER A NEXT */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex flex-col items-center"
              >
                
                <div className="mb-4 flex flex-col items-center">
                  <ArrowDown
                    className="h-5 w-5 text-text-tertiary"
                    aria-hidden="true"
                  />
                  <span className="mb-2 mt-2 text-xs font-bold uppercase tracking-[0.16em] text-text-primary">
                    Next
                  </span>

                  <ArrowDown
                    className="h-5 w-5 text-text-tertiary"
                    aria-hidden="true"
                  />
                </div>

                <div className="w-full max-w-[320px] rounded-2xl border border-border bg-surface px-6 py-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <Layers3
                      className="h-8 w-8 shrink-0 text-text-primary"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />

                    <div>
                      <div className="font-medium text-text-primary">
                        Advanced Indexing
                      </div>

                      <div className="text-sm text-text-tertiary">
                        (Next Topic)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-signal">
                    Learner A
                  </div>

                  <p className="max-w-[300px] text-sm leading-6 text-text-secondary">
                    Already strong in core concepts.
                    <br />
                    Ready for more advanced topics.
                  </p>
                </div>
              </motion.div>

              {/* CENTER EMPTY SPACE */}
              <div className="hidden md:block" />

              {/* LEARNER B NEXT */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="flex flex-col items-center"
              >

                <div className="mb-4 flex flex-col items-center">
                  <ArrowDown
                    className="h-5 w-5 text-signal"
                    aria-hidden="true"
                  />
                  <span className="mb-2 mt-2 text-xs font-bold uppercase tracking-[0.16em] text-text-primary">
                    Next
                  </span>

                  <ArrowDown
                    className="h-5 w-5 text-signal"
                    aria-hidden="true"
                  />
                </div>

                <div className="w-full max-w-[320px] rounded-2xl bg-signal px-6 py-5 shadow-md">
                  <div className="flex items-center gap-4">
                    <BookOpen
                      className="h-8 w-8 shrink-0 text-paper"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />

                    <div>
                      <div className="font-medium text-paper">
                        Normalization Practice
                      </div>

                      <div className="text-sm text-paper/80">
                        (Targeted Practice)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-signal">
                    Learner B
                  </div>

                  <p className="max-w-[300px] text-sm leading-6 text-text-secondary">
                    Needs more practice on normalization.
                    <br />
                    Gets a personalized next step.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdaptationSection;