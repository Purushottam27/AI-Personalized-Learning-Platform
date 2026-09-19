import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import OnboardingLayout from '../components/OnboardingLayout';
import SelectionCard from '../components/SelectionCard';
import OtherInput from '../components/OtherInput';
import { Loader2 } from 'lucide-react';
import type { InstructorProfile } from '../api/onboarding.api';

// ─── Constants & Options ──────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  'Software Developer / Designer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Cybersecurity Professional',
  'Educator / Instructor',
  'Finance Professional',
];

const EXPERTISE_OPTIONS = [
  'Programming & Software Development',
  'Data Science & Artificial Intelligence',
  'Mathematics & Statistics',
  'Business & Entrepreneurship',
  'Finance & Economics',
  'Science & Technology',
];

// ─── Step Content ─────────────────────────────────────────────────────────────

const STEP_CONTENT = {
  1: {
    title: 'What best describes your professional role?',
    description:
      'Tell us about your professional background so we can tailor the instructor experience to your expertise.',
  },
  2: {
    title: 'What areas are you experienced in teaching?',
    description:
      'Choose the subjects you are most comfortable teaching. You can select more than one.',
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

export default function InstructorOnboardingPage() {
  const navigate = useNavigate();

  const {
    profile,
    isLoading,
    isSaving,
    error,
    updateInstructorStep,
    isInstructorComplete,
  } = useOnboarding();

  const instructorProfile = profile as InstructorProfile | null;

  // ─── Local State for Form ──────────────────────────────────────────────────

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Professional Role
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isOtherRoleSelected, setIsOtherRoleSelected] = useState(false);
  const [otherRoleValue, setOtherRoleValue] = useState('');

  // Step 2: Expertise Areas
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [isOtherExpertiseSelected, setIsOtherExpertiseSelected] =
    useState(false);
  const [otherExpertiseValue, setOtherExpertiseValue] = useState('');

  // ─── Sync Local State with Backend Profile ─────────────────────────────────

  useEffect(() => {
    if (instructorProfile) {
      if (instructorProfile.professionalTitle) {
        if (
          ROLE_OPTIONS.includes(
            instructorProfile.professionalTitle,
          )
        ) {
          setSelectedRole(
            instructorProfile.professionalTitle,
          );
        } else {
          setIsOtherRoleSelected(true);
          setOtherRoleValue(
            instructorProfile.professionalTitle,
          );
        }
      }

      if (instructorProfile.expertiseAreas?.length > 0) {
        const standard =
          instructorProfile.expertiseAreas.filter((expertise) =>
            EXPERTISE_OPTIONS.includes(expertise),
          );

        const other = extractOtherValue(
          instructorProfile.expertiseAreas,
          EXPERTISE_OPTIONS,
        );

        setSelectedExpertise(standard);

        if (other) {
          setIsOtherExpertiseSelected(true);
          setOtherExpertiseValue(other);
        }
      }

      // Resume from the first incomplete step.
      if (!isInstructorComplete) {
        if (!instructorProfile.professionalTitle) {
          setCurrentStep(1);
        } else if (
          !instructorProfile.expertiseAreas?.length
        ) {
          setCurrentStep(2);
        }
      }
    }
  }, [instructorProfile, isInstructorComplete]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          (selectedRole !== null &&
            selectedRole !== 'Other') ||
          (isOtherRoleSelected &&
            otherRoleValue.trim().length > 0)
        );

      case 2:
        return (
          selectedExpertise.length > 0 ||
          (isOtherExpertiseSelected &&
            otherExpertiseValue.trim().length > 0)
        );

      default:
        return false;
    }
  }, [
    currentStep,
    selectedRole,
    isOtherRoleSelected,
    otherRoleValue,
    selectedExpertise,
    isOtherExpertiseSelected,
    otherExpertiseValue,
  ]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        const finalRole =
          isOtherRoleSelected && otherRoleValue.trim()
            ? otherRoleValue.trim()
            : selectedRole!;

        await updateInstructorStep({
          professionalTitle: finalRole,
        });

        setCurrentStep(2);
      } else if (currentStep === 2) {
        const finalExpertise = [...selectedExpertise];

        if (
          isOtherExpertiseSelected &&
          otherExpertiseValue.trim()
        ) {
          finalExpertise.push(
            otherExpertiseValue.trim(),
          );
        }

        await updateInstructorStep({
          expertiseAreas: finalExpertise,
        });

        navigate('/instructor-dashboard');
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
      setArr(
        arr.filter((value) => value !== item),
      );
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
          aria-label="Loading your instructor profile"
        >
          <Loader2
            className="h-7 w-7 animate-spin text-signal"
            aria-hidden="true"
          />

          <span className="text-sm text-text-secondary">
            Preparing your instructor profile...
          </span>
        </div>
      </div>
    );
  }

  const stepContent =
    STEP_CONTENT[
      currentStep as keyof typeof STEP_CONTENT
    ];

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={2}
      title={stepContent.title}
      description={stepContent.description}
      onBack={currentStep > 1 ? handleBack : undefined}
      onNext={handleNext}
      isNextDisabled={!isCurrentStepValid}
      isSaving={isSaving}
      isCompleteStep={currentStep === 2}
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

      {/* Step 1 — Professional Role */}
      {currentStep === 1 && (
        <div className="space-y-3">
          {ROLE_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="single"
              selected={
                selectedRole === option &&
                !isOtherRoleSelected
              }
              onChange={() => {
                setSelectedRole(option);
                setIsOtherRoleSelected(false);
              }}
            />
          ))}

          <SelectionCard
            label="Other — Please specify"
            type="single"
            selected={isOtherRoleSelected}
            onChange={() => {
              setIsOtherRoleSelected(true);
              setSelectedRole('Other');
            }}
          />

          <OtherInput
            isVisible={isOtherRoleSelected}
            value={otherRoleValue}
            onChange={setOtherRoleValue}
            placeholder="E.g. Product Manager, Technical Writer..."
          />
        </div>
      )}

      {/* Step 2 — Expertise Areas */}
      {currentStep === 2 && (
        <div className="space-y-3">
          {EXPERTISE_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              type="multiple"
              selected={selectedExpertise.includes(option)}
              onChange={() =>
                toggleArrayItem(
                  selectedExpertise,
                  setSelectedExpertise,
                  option,
                )
              }
            />
          ))}

          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherExpertiseSelected}
            onChange={() =>
              setIsOtherExpertiseSelected(
                !isOtherExpertiseSelected,
              )
            }
          />

          <OtherInput
            isVisible={isOtherExpertiseSelected}
            value={otherExpertiseValue}
            onChange={setOtherExpertiseValue}
            placeholder="E.g. Web3, Game Development..."
          />
        </div>
      )}
    </OnboardingLayout>
  );
}