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

// ─── Helper to extract non-standard "Other" value ───────────────────────────
function extractOtherValue(selectedValues: string[], standardOptions: string[]) {
  return selectedValues.find((val) => !standardOptions.includes(val)) || '';
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

  // ─── Local State for Form ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Professional Role
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isOtherRoleSelected, setIsOtherRoleSelected] = useState(false);
  const [otherRoleValue, setOtherRoleValue] = useState('');

  // Step 2: Expertise Areas
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [isOtherExpertiseSelected, setIsOtherExpertiseSelected] = useState(false);
  const [otherExpertiseValue, setOtherExpertiseValue] = useState('');

  // ─── Sync Local State with Backend Profile ───────────────────────────────
  useEffect(() => {
    if (instructorProfile) {
      if (instructorProfile.professionalTitle) {
        if (ROLE_OPTIONS.includes(instructorProfile.professionalTitle)) {
          setSelectedRole(instructorProfile.professionalTitle);
        } else {
          setIsOtherRoleSelected(true);
          setOtherRoleValue(instructorProfile.professionalTitle);
        }
      }
      
      if (instructorProfile.expertiseAreas?.length > 0) {
        const standard = instructorProfile.expertiseAreas.filter(e => EXPERTISE_OPTIONS.includes(e));
        const other = extractOtherValue(instructorProfile.expertiseAreas, EXPERTISE_OPTIONS);
        setSelectedExpertise(standard);
        if (other) {
          setIsOtherExpertiseSelected(true);
          setOtherExpertiseValue(other);
        }
      }

      // Resume logic
      if (!isInstructorComplete) {
        if (!instructorProfile.professionalTitle) setCurrentStep(1);
        else if (!instructorProfile.expertiseAreas?.length) setCurrentStep(2);
      }
    }
  }, [instructorProfile, isInstructorComplete]);

  // ─── Validation ────────────────────────────────────────────────────────────
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (selectedRole !== null && selectedRole !== 'Other') || (isOtherRoleSelected && otherRoleValue.trim().length > 0);
      case 2:
        return selectedExpertise.length > 0 || (isOtherExpertiseSelected && otherExpertiseValue.trim().length > 0);
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
        const finalRole = isOtherRoleSelected && otherRoleValue.trim() ? otherRoleValue.trim() : selectedRole!;
        await updateInstructorStep({ professionalTitle: finalRole });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        const finalExpertise = [...selectedExpertise];
        if (isOtherExpertiseSelected && otherExpertiseValue.trim()) {
          finalExpertise.push(otherExpertiseValue.trim());
        }
        await updateInstructorStep({ expertiseAreas: finalExpertise });
        // Onboarding complete -> dashboard
        navigate('/instructor-dashboard');
      }
    } catch (err) {
      // Handled by hook
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleArrayItem = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={2}
      title={
        currentStep === 1
          ? 'What best describes your professional role?'
          : 'What areas are you experienced in teaching?'
      }
      onBack={currentStep > 1 ? handleBack : undefined}
      onNext={handleNext}
      isNextDisabled={!isCurrentStepValid}
      isSaving={isSaving}
      isCompleteStep={currentStep === 2}
    >
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
          {error}
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-3">
          {ROLE_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="single"
              selected={selectedRole === opt && !isOtherRoleSelected}
              onChange={() => {
                setSelectedRole(opt);
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

      {currentStep === 2 && (
        <div className="space-y-3">
          {EXPERTISE_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="multiple"
              selected={selectedExpertise.includes(opt)}
              onChange={() => toggleArrayItem(selectedExpertise, setSelectedExpertise, opt)}
            />
          ))}
          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherExpertiseSelected}
            onChange={() => setIsOtherExpertiseSelected(!isOtherExpertiseSelected)}
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
