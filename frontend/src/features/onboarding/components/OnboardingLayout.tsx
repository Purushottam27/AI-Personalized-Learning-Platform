import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ThemeToggle from '../../../components/ui/ThemeToggle';

export interface OnboardingLayoutProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description?: string;
  onBack?: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isSaving?: boolean;
  isCompleteStep?: boolean;
  children: React.ReactNode;
}

export default function OnboardingLayout({
  currentStep,
  totalSteps,
  title,
  description,
  onBack,
  onNext,
  isNextDisabled = false,
  isSaving = false,
  isCompleteStep = false,
  children,
}: OnboardingLayoutProps) {
  const progressPercentage = Math.round(
    (currentStep / totalSteps) * 100,
  );

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans flex flex-col selection:bg-signal-soft selection:text-text-primary">
      {/* =========================================================
          HEADER
          ========================================================= */}
      <header
  className={[
    'sticky top-0 z-20 border-b border-border',
    'bg-surface/90 backdrop-blur-md',
    'relative',
  ].join(' ')}
>
  <div
    className={[
      'pointer-events-none absolute inset-0',
      'bg-linear-to-r',
      'from-signal-soft/35 via-transparent to-sage-soft/20',
    ].join(' ')}
    aria-hidden="true"
  />
        <div className="mx-auto flex h-18 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left — Back / Brand */}
          <div className="flex min-w-0 flex-1 items-center">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isSaving}
                className={[
                  'group inline-flex items-center gap-2 rounded-lg px-2 py-1.5',
                  'text-sm font-medium text-text-secondary',
                  'transition-colors duration-150',
                  'hover:bg-surface hover:text-text-primary',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                  'disabled:cursor-not-allowed disabled:text-text-disabled',
                ].join(' ')}
                aria-label="Go back"
              >
                <ArrowLeft
                  className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />

                <span className="hidden sm:inline">
                  Back
                </span>
              </button>
            ) : (
              <div
                className="font-display text-base sm:text-lg font-semibold tracking-tight bg-linear-to-r from-signal to-sage bg-clip-text text-transparent"
                aria-label="Learnova"
              >
                Learnova
              </div>
            )}
          </div>

          {/* Center — Step Indicator */}
          <div className="flex flex-1 justify-center">
            <div
              className={[
                'inline-flex items-center gap-2 rounded-full',
                'border border-border-muted',
                'bg-surface px-3.5 py-1.5',
                'shadow-sm shadow-ink/5',
              ].join(' ')}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Step
              </span>

              <span className="text-sm font-semibold tabular-nums text-text-primary">
                {currentStep}
              </span>

              <span
                className="text-sm text-text-tertiary"
                aria-hidden="true"
              >
                /
              </span>

              <span className="text-sm font-medium tabular-nums text-text-secondary">
                {totalSteps}
              </span>
            </div>
          </div>

          {/* Right — Progress + Theme */}
          <div className="flex flex-1 items-center justify-end gap-3">
            <span className="hidden text-xs font-medium tabular-nums text-text-tertiary sm:block">
              {progressPercentage}%
            </span>

            <ThemeToggle />
          </div>
        </div>

        {/* =========================================================
            SEGMENTED PROGRESS
            ========================================================= */}
        <div
          className="mx-auto flex w-full max-w-5xl gap-1.5 px-4 pb-3 sm:px-6 lg:px-8"
          aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
        >
          {Array.from(
            { length: totalSteps },
            (_, index) => {
              const stepNumber = index + 1;

              const isCompleted =
                stepNumber < currentStep;

              const isCurrent =
                stepNumber === currentStep;

              return (
                <div
                  key={stepNumber}
                  className={[
                    'h-1 flex-1 overflow-hidden rounded-full',
                    isCompleted
                      ? 'bg-sage-soft'
                      : 'bg-border-muted',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <motion.div
                    className={[
                      'h-full rounded-full',
                      isCompleted
                        ? 'bg-sage'
                        : isCurrent
                          ? 'bg-signal'
                          : 'bg-transparent',
                    ].join(' ')}
                    initial={false}
                    animate={{
                      width:
                        isCompleted || isCurrent
                          ? '100%'
                          : '0%',
                    }}
                    transition={{
                      duration: 0.35,
                      ease: 'easeOut',
                    }}
                  />
                </div>
              );
            },
          )}
        </div>
      </header>

      {/* =========================================================
          MAIN CONTENT
          ========================================================= */}
      <main className="relative flex-1 overflow-hidden">
        {/* Subtle thematic atmosphere */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-signal-soft/30 to-transparent dark:from-signal-soft/20"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-145px)] w-full max-w-5xl items-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -12,
                }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                className="mx-auto w-full max-w-3xl"
              >
                {/* =================================================
                    STEP INTRODUCTION
                    ================================================= */}
                <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-signal">
                    Personalize your learning
                  </p>

                  <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
                    {title}
                  </h1>

                  {description && (
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
                      {description}
                    </p>
                  )}
                </div>

                {/* =================================================
                    STEP CONTENT SURFACE
                    ================================================= */}
                <section
                  aria-label={`Onboarding step ${currentStep}`}
                  className={[
                    'rounded-2xl border border-border',
                    'bg-surface shadow-lg shadow-ink/5',
                    'p-4 sm:p-6 lg:p-8',
                  ].join(' ')}
                >
                  {children}
                </section>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* =========================================================
          BOTTOM ACTION BAR
          ========================================================= */}
      <footer className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <Button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled || isSaving}
            className="min-w-33"
          >
            {isSaving ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />

                <span>Saving...</span>
              </>
            ) : isCompleteStep ? (
              'Complete Profile'
            ) : (
              <>
                <span>Continue</span>

                <span aria-hidden="true">
                  →
                </span>
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}