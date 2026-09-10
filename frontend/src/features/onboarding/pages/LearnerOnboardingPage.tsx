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

// ─── Helper to extract non-standard "Other" value ───────────────────────────
function extractOtherValue(selectedValues: string[], standardOptions: string[]) {
  return selectedValues.find((val) => !standardOptions.includes(val)) || '';
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

  // ─── Local State for Form ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isOtherInterestSelected, setIsOtherInterestSelected] = useState(false);
  const [otherInterestValue, setOtherInterestValue] = useState('');

  // Step 2: Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isOtherGoalSelected, setIsOtherGoalSelected] = useState(false);
  const [otherGoalValue, setOtherGoalValue] = useState('');

  // Step 3: Experience
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  // Step 4: Daily Study Time
  const [selectedStudyTime, setSelectedStudyTime] = useState<string | null>(null);

  // Step 5: Format
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  // ─── Sync Local State with Backend Profile ───────────────────────────────
  useEffect(() => {
    if (learnerProfile) {
      if (learnerProfile.interests?.length > 0) {
        const standard = learnerProfile.interests.filter(i => INTEREST_OPTIONS.includes(i));
        const other = extractOtherValue(learnerProfile.interests, INTEREST_OPTIONS);
        setSelectedInterests(standard);
        if (other) {
          setIsOtherInterestSelected(true);
          setOtherInterestValue(other);
        }
      }
      if (learnerProfile.goals?.length > 0) {
        const standard = learnerProfile.goals.filter(g => GOAL_OPTIONS.includes(g));
        const other = extractOtherValue(learnerProfile.goals, GOAL_OPTIONS);
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
        setSelectedStudyTime(learnerProfile.studyPreferences.dailyStudyTime);
      }
      if (learnerProfile.studyPreferences?.preferredLearningFormat?.length) {
        setSelectedFormats(learnerProfile.studyPreferences.preferredLearningFormat);
      }

      // Resume logic: determine the first incomplete step
      if (!isLearnerComplete) {
        if (!learnerProfile.interests?.length) setCurrentStep(1);
        else if (!learnerProfile.goals?.length) setCurrentStep(2);
        else if (!learnerProfile.experienceLevel) setCurrentStep(3);
        else if (!learnerProfile.studyPreferences?.dailyStudyTime) setCurrentStep(4);
        else if (!learnerProfile.studyPreferences?.preferredLearningFormat?.length) setCurrentStep(5);
      }
    }
  }, [learnerProfile, isLearnerComplete]);

  // If complete, we can either redirect to dashboard or allow editing if they came here directly.
  // We'll let the OnboardingGuard handle redirecting newly registered users, but if a user explicitly
  // visits /onboarding, we should allow them to edit. We'll start at step 1 if they are complete.

  // ─── Validation ────────────────────────────────────────────────────────────
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return selectedInterests.length > 0 || (isOtherInterestSelected && otherInterestValue.trim().length > 0);
      case 2:
        return selectedGoals.length > 0 || (isOtherGoalSelected && otherGoalValue.trim().length > 0);
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
        if (isOtherInterestSelected && otherInterestValue.trim()) {
          finalInterests.push(otherInterestValue.trim());
        }
        await updateLearnerStep({ interests: finalInterests });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        const finalGoals = [...selectedGoals];
        if (isOtherGoalSelected && otherGoalValue.trim()) {
          finalGoals.push(otherGoalValue.trim());
        }
        await updateLearnerStep({ goals: finalGoals });
        setCurrentStep(3);
      } else if (currentStep === 3) {
        await updateLearnerStep({ experienceLevel: selectedExperience! });
        setCurrentStep(4);
      } else if (currentStep === 4) {
        await updateLearnerStep({ studyPreferences: { dailyStudyTime: selectedStudyTime! } });
        setCurrentStep(5);
      } else if (currentStep === 5) {
        await updateLearnerStep({ studyPreferences: { preferredLearningFormat: selectedFormats } });
        // After step 5, onboarding is complete, redirect to dashboard
        navigate('/learner-dashboard');
      }
    } catch (err) {
      // Error is handled by the hook and displayed below
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ─── Toggle Helpers ────────────────────────────────────────────────────────
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
      totalSteps={5}
      title={
        currentStep === 1 ? 'What would you like to learn about?' :
        currentStep === 2 ? 'What are your main learning goals?' :
        currentStep === 3 ? 'How would you describe your current experience with your selected interests?' :
        currentStep === 4 ? 'How much time can you dedicate to learning each day?' :
        'How do you prefer to learn?'
      }
      onBack={currentStep > 1 ? handleBack : undefined}
      onNext={handleNext}
      isNextDisabled={!isCurrentStepValid}
      isSaving={isSaving}
      isCompleteStep={currentStep === 5}
    >
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
          {error}
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-3">
          {INTEREST_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="multiple"
              selected={selectedInterests.includes(opt)}
              onChange={() => toggleArrayItem(selectedInterests, setSelectedInterests, opt)}
            />
          ))}
          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherInterestSelected}
            onChange={() => setIsOtherInterestSelected(!isOtherInterestSelected)}
          />
          <OtherInput
            isVisible={isOtherInterestSelected}
            value={otherInterestValue}
            onChange={setOtherInterestValue}
            placeholder="E.g. Quantum Computing, History, Art..."
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-3">
          {GOAL_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="multiple"
              selected={selectedGoals.includes(opt)}
              onChange={() => toggleArrayItem(selectedGoals, setSelectedGoals, opt)}
            />
          ))}
          <SelectionCard
            label="Other — Please specify"
            type="multiple"
            selected={isOtherGoalSelected}
            onChange={() => setIsOtherGoalSelected(!isOtherGoalSelected)}
          />
          <OtherInput
            isVisible={isOtherGoalSelected}
            value={otherGoalValue}
            onChange={setOtherGoalValue}
            placeholder="E.g. Start a new company, Build a portfolio..."
          />
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-3">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="single"
              selected={selectedExperience === opt}
              onChange={() => setSelectedExperience(opt)}
            />
          ))}
        </div>
      )}

      {currentStep === 4 && (
        <div className="space-y-3">
          {STUDY_TIME_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="single"
              selected={selectedStudyTime === opt}
              onChange={() => setSelectedStudyTime(opt)}
            />
          ))}
        </div>
      )}

      {currentStep === 5 && (
        <div className="space-y-3">
          {FORMAT_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt}
              label={opt}
              type="multiple"
              selected={selectedFormats.includes(opt)}
              onChange={() => toggleArrayItem(selectedFormats, setSelectedFormats, opt)}
            />
          ))}
        </div>
      )}
    </OnboardingLayout>
  );
}
