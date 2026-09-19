import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import OnboardingLayout from '../components/OnboardingLayout';
import SelectionCard from '../components/SelectionCard';
import OtherInput from '../components/OtherInput';
import { Loader2 } from 'lucide-react';
import type { LearnerProfile } from '../api/onboarding.api';

// ─── Constants & Options ──────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  'Programming & Software Development',
  'Data Science & Artificial Intelligence',
  'Mathematics & Statistics',
  'Business & Entrepreneurship',
  'Finance & Economics',
  'Science & Technology',
];

const GOAL_OPTIONS = [
  'Build practical skills',
  'Prepare for exams or academic studies',
  'Prepare for a job or career',
  'Improve existing knowledge',
  'Learn something new for personal interest',
  'Prepare for interviews',
];

const EXPERIENCE_OPTIONS = [
  'I have no prior knowledge',
  'I have a basic understanding',
  'I am comfortable with the fundamentals',
  'I have substantial experience',
  "I'm not sure",
];

const STUDY_TIME_OPTIONS = [
  'Less than 1 hour',
  '1-2 hours',
  '2-3 hours',
  '3-4 hours',
  '5 or more hours',
];

const FORMAT_OPTIONS = [
  'Reading',
  'Videos',
  'Interactive Learning',
  'Practice Exercises',
  'Projects',
];

// ─── Step Content ─────────────────────────────────────────────────────────────

const STEP_CONTENT = {
  1: {
    title: 'What would you like to learn about?',
    description:
      'Choose the subjects you are most interested in. You can select more than one.',
  },
  2: {
    title: 'What are your main learning goals?',
    description:
      'Tell us what you want to achieve so we can shape your learning path around your goals.',
  },
  3: {
    title:
      'How would you describe your current experience with your selected interests?',
    description:
      'Your current experience helps us start you at a level that feels right for you.',
  },
  4: {
    title: 'How much time can you dedicate to learning each day?',
    description:
      'We will use your available time to help build a realistic learning routine.',
  },
  5: {
    title: 'How do you prefer to learn?',
    description:
      'Choose the learning formats that work best for you. You can select more than one.',
  },
} as const;

// ─── Helper to extract non-standard "Other" value ────────────────────────────

function extractOtherValue(
  selectedValues: string[],
  standardOptions: string[],
) {
  return selectedValues.find(
    (val) => !standardOptions.includes(val),
  ) || '';
}

export default function LearnerOnboardingPage() {
  const navigate = useNavigate();

  const {
    profile,
    isLoading,
    isSaving,
    error,
    updateLearnerStep,
    isLearnerComplete,
  } = useOnboarding();

  const learnerProfile = profile as LearnerProfile | null;

  // ─── Local State for Form ──────────────────────────────────────────────────

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isOtherInterestSelected, setIsOtherInterestSelected] =
    useState(false);
  const [otherInterestValue, setOtherInterestValue] = useState('');

  // Step 2: Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isOtherGoalSelected, setIsOtherGoalSelected] = useState(false);
  const [otherGoalValue, setOtherGoalValue] = useState('');

  // Step 3: Experience
  const [selectedExperience, setSelectedExperience] = useState<string | null>(
    null,
  );

  // Step 4: Daily Study Time
  const [selectedStudyTime, setSelectedStudyTime] = useState<string | null>(
    null,
  );

  // Step 5: Format
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  // ─── Sync Local State with Backend Profile ─────────────────────────────────

  useEffect(() => {
    if (learnerProfile) {
      if (learnerProfile.interests?.length > 0) {
        const standard = learnerProfile.interests.filter((interest) =>
          INTEREST_OPTIONS.includes(interest),
        );

        const other = extractOtherValue(
          learnerProfile.interests,
          INTEREST_OPTIONS,
        );

        setSelectedInterests(standard);

        if (other) {
          setIsOtherInterestSelected(true);
          setOtherInterestValue(other);
        }
      }

      if (learnerProfile.goals?.length > 0) {
        const standard = learnerProfile.goals.filter((goal) =>
          GOAL_OPTIONS.includes(goal),
        );

        const other = extractOtherValue(
          learnerProfile.goals,
          GOAL_OPTIONS,
        );

        setSelectedGoals(standard);

        if (other) {
          setIsOtherGoalSelected(true);
          setOtherGoalValue(other);
        }
      }

      if (learnerProfile.experienceLevel) {
        setSelectedExperience(learnerProfile.experienceLevel);
      }

      if (learnerProfile.studyPreferences?.dailyStudyTime) {
        setSelectedStudyTime(
          learnerProfile.studyPreferences.dailyStudyTime,
        );
      }

      if (
        learnerProfile.studyPreferences?.preferredLearningFormat?.length
      ) {
        setSelectedFormats(
          learnerProfile.studyPreferences.preferredLearningFormat,
        );
      }

      // Resume from the first incomplete step.
      if (!isLearnerComplete) {
        if (!learnerProfile.interests?.length) {
          setCurrentStep(1);
        } else if (!learnerProfile.goals?.length) {
          setCurrentStep(2);
        } else if (!learnerProfile.experienceLevel) {
          setCurrentStep(3);
        } else if (!learnerProfile.studyPreferences?.dailyStudyTime) {
          setCurrentStep(4);
        } else if (
          !learnerProfile.studyPreferences?.preferredLearningFormat?.length
        ) {
          setCurrentStep(5);
        }
      }
    }
  }, [learnerProfile, isLearnerComplete]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          selectedInterests.length > 0 ||
          (isOtherInterestSelected &&
            otherInterestValue.trim().length > 0)
        );

      case 2:
        return (
          selectedGoals.length > 0 ||
          (isOtherGoalSelected &&
            otherGoalValue.trim().length > 0)
        );

      case 3:
        return selectedExperience !== null;

      case 4:
        return selectedStudyTime !== null;

      case 5:
        return selectedFormats.length > 0;

      default:
        return false;
    }
  }, [
    currentStep,
    selectedInterests,
    isOtherInterestSelected,
    otherInterestValue,
    selectedGoals,
    isOtherGoalSelected,
    otherGoalValue,
    selectedExperience,
    selectedStudyTime,
    selectedFormats,
  ]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        const finalInterests = [...selectedInterests];

        if (
          isOtherInterestSelected &&
          otherInterestValue.trim()
        ) {
          finalInterests.push(otherInterestValue.trim());
        }

        await updateLearnerStep({
          interests: finalInterests,
        });

        setCurrentStep(2);
      } else if (currentStep === 2) {
        const finalGoals = [...selectedGoals];

        if (
          isOtherGoalSelected &&
          otherGoalValue.trim()
        ) {
          finalGoals.push(otherGoalValue.trim());
        }

        await updateLearnerStep({
          goals: finalGoals,
        });

        setCurrentStep(3);
      } else if (currentStep === 3) {
        await updateLearnerStep({
          experienceLevel: selectedExperience!,
        });

        setCurrentStep(4);
      } else if (currentStep === 4) {
        await updateLearnerStep({
          studyPreferences: {
            dailyStudyTime: selectedStudyTime!,
          },
        });

        setCurrentStep(5);
      } else if (currentStep === 5) {
        await updateLearnerStep({
          studyPreferences: {
            preferredLearningFormat: selectedFormats,
          },
        });

        navigate('/learner-dashboard');
      }
    } catch (err) {
      // Error is handled by the onboarding hook.
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ─── Toggle Helpers ────────────────────────────────────────────────────────

  const toggleArrayItem = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    if (arr.includes(item)) {
      setArr(arr.filter((value) => value !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-3"
          role="status"
          aria-label="Loading your learning profile"
        >
          <Loader2
            className="h-7 w-7 animate-spin text-signal"
            aria-hidden="true"
          />

          <span className="text-sm text-text-secondary">
            Preparing your learning profile...
          </span>
        </div>
      </div>
    );
  }

  const stepContent = STEP_CONTENT[
    currentStep as keyof typeof STEP_CONTENT
  ];

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={5}
      title={stepContent.title}
      description={stepContent.description}
      onBack={currentStep > 1 ? handleBack : undefined}
      onNext={handleNext}
      isNextDisabled={!isCurrentStepValid}
      isSaving={isSaving}
      isCompleteStep={currentStep === 5}
    >
      {/* API / Saving Error */}
      {error && (
        <div
          className={[
            'mb-6 flex items-start gap-3 rounded-xl border p-4',
            'bg-error-soft border-error text-error',
          ].join(' ')}
          role="alert"
        >
          <span className="text-sm leading-5">
            {error}
          </span>
        </div>
      )}

      {/* Step 1 — Interests */}
      {currentStep === 1 && (
        <div className="space-y-3">
          {INTEREST_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="multiple"
              selected={selectedInterests.includes(option)}
              onChange={() =>
                toggleArrayItem(
                  selectedInterests,
                  setSelectedInterests,
                  option,
                )
              }
            />
          ))}

          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherInterestSelected}
            onChange={() =>
              setIsOtherInterestSelected(
                !isOtherInterestSelected,
              )
            }
          />

          <OtherInput
            isVisible={isOtherInterestSelected}
            value={otherInterestValue}
            onChange={setOtherInterestValue}
            placeholder="E.g. Quantum Computing, History, Art..."
          />
        </div>
      )}

      {/* Step 2 — Goals */}
      {currentStep === 2 && (
        <div className="space-y-3">
          {GOAL_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="multiple"
              selected={selectedGoals.includes(option)}
              onChange={() =>
                toggleArrayItem(
                  selectedGoals,
                  setSelectedGoals,
                  option,
                )
              }
            />
          ))}

          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherGoalSelected}
            onChange={() =>
              setIsOtherGoalSelected(!isOtherGoalSelected)
            }
          />

          <OtherInput
            isVisible={isOtherGoalSelected}
            value={otherGoalValue}
            onChange={setOtherGoalValue}
            placeholder="E.g. Start a new company, Build a portfolio..."
          />
        </div>
      )}

      {/* Step 3 — Experience */}
      {currentStep === 3 && (
        <div className="space-y-3">
          {EXPERIENCE_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="single"
              selected={selectedExperience === option}
              onChange={() => setSelectedExperience(option)}
            />
          ))}
        </div>
      )}

      {/* Step 4 — Study Time */}
      {currentStep === 4 && (
        <div className="space-y-3">
          {STUDY_TIME_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="single"
              selected={selectedStudyTime === option}
              onChange={() => setSelectedStudyTime(option)}
            />
          ))}
        </div>
      )}

      {/* Step 5 — Learning Format */}
      {currentStep === 5 && (
        <div className="space-y-3">
          {FORMAT_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="multiple"
              selected={selectedFormats.includes(option)}
              onChange={() =>
                toggleArrayItem(
                  selectedFormats,
                  setSelectedFormats,
                  option,
                )
              }
            />
          ))}
        </div>
      )}
    </OnboardingLayout>
  );
}