import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
  getLearnerProfile,
  updateLearnerOnboarding,
  getInstructorProfile,
  updateInstructorOnboarding,
  type LearnerProfile,
  type InstructorProfile,
  type LearnerOnboardingUpdatePayload,
  type InstructorOnboardingUpdatePayload,
  isLearnerOnboardingComplete,
  isInstructorOnboardingComplete,
} from '../api/onboarding.api';
import { isApiError } from '../../../lib/axios';

export type OnboardingProfile = LearnerProfile | InstructorProfile | null;

interface UseOnboardingReturn {
  profile: OnboardingProfile;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchProfile: () => Promise<OnboardingProfile>;
  updateLearnerStep: (payload: LearnerOnboardingUpdatePayload) => Promise<void>;
  updateInstructorStep: (payload: InstructorOnboardingUpdatePayload) => Promise<void>;
  isLearnerComplete: boolean;
  isInstructorComplete: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OnboardingProfile>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<OnboardingProfile> => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (user.role === 'LEARNER') {
        const p = await getLearnerProfile();
        setProfile(p);
        return p;
      } else if (user.role === 'INSTRUCTOR') {
        const p = await getInstructorProfile();
        setProfile(p);
        return p;
      }
      return null;
    } catch (err: unknown) {
      if (isApiError(err) && err.status === 404) {
        // 404 simply means onboarding hasn't started yet.
        // It's a valid state, not an application error.
        setProfile(null);
        return null;
      }
      const msg = isApiError(err) ? err.message : 'An error occurred fetching profile';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    fetchProfile().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const updateLearnerStep = useCallback(
    async (payload: LearnerOnboardingUpdatePayload) => {
      if (user?.role !== 'LEARNER') throw new Error('Invalid role');
      setIsSaving(true);
      setError(null);
      try {
        const updated = await updateLearnerOnboarding(payload);
        setProfile(updated);
      } catch (err: unknown) {
        const msg = isApiError(err) ? err.message : 'Failed to save progress';
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user]
  );

  const updateInstructorStep = useCallback(
    async (payload: InstructorOnboardingUpdatePayload) => {
      if (user?.role !== 'INSTRUCTOR') throw new Error('Invalid role');
      setIsSaving(true);
      setError(null);
      try {
        const updated = await updateInstructorOnboarding(payload);
        setProfile(updated);
      } catch (err: unknown) {
        const msg = isApiError(err) ? err.message : 'Failed to save progress';
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user]
  );

  return {
    profile,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    updateLearnerStep,
    updateInstructorStep,
    isLearnerComplete: isLearnerOnboardingComplete(profile as LearnerProfile | null),
    isInstructorComplete: isInstructorOnboardingComplete(profile as InstructorProfile | null),
  };
}
