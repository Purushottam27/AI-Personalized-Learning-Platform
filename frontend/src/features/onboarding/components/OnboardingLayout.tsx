import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

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
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);
  
  // To avoid page jumps, we ensure the container respects a minimum height
  // and we use AnimatePresence with mode="wait" for step transitions.
  
  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink selection:bg-signal/20 selection:text-ink">
      
      {/* Top Navigation & Progress */}
      <header className="sticky top-0 z-10 bg-paper/80 backdrop-blur-md border-b border-ink/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex-1">
            {onBack && (
              <button
                onClick={onBack}
                disabled={isSaving}
                className="group flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors disabled:opacity-50"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>
          
          <div className="flex-1 flex justify-center">
            <span className="text-xs font-semibold tracking-widest text-ink/40 uppercase">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          
          <div className="flex-1" />
          
        </div>
        
        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-ink/5" aria-hidden="true">
          <motion.div
            className="h-full bg-signal"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ ease: 'easeInOut', duration: 0.5 }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              {/* Step Header */}
              <div className="text-center space-y-3">
                <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-ink/60 text-base max-w-md mx-auto">
                    {description}
                  </p>
                )}
              </div>

              {/* Step Content */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-ink/5 p-4 sm:p-8 shadow-sm">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="sticky bottom-0 z-10 bg-paper border-t border-ink/5 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto flex justify-end">
          <Button
            onClick={onNext}
            disabled={isNextDisabled || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCompleteStep ? (
              'Complete Profile'
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
