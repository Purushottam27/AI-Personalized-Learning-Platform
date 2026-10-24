/**
 * LearnerProfileSection.tsx
 *
 * Editable section for Learner Profile:
 * - Interests
 * - Goals
 * - Experience Level
 * - Study Preferences (Daily Study Time, Preferred Learning Formats)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Check, AlertCircle, RefreshCw, Compass } from 'lucide-react';
import Button from '../../../components/ui/Button';
import {
  EXPERIENCE_LEVELS,
  DAILY_STUDY_TIMES,
  PREFERRED_LEARNING_FORMATS,
  type LearnerProfileData,
  type ExperienceLevel,
  type DailyStudyTime,
  type PreferredLearningFormat,
  type UpdateLearnerProfilePayload,
} from '../types/profile.types';
import { getLearnerProfile, updateLearnerProfile } from '../api/profile.api';
import { isApiError } from '../../../lib/axios';

export const LearnerProfileSection: React.FC = () => {
  const navigate = useNavigate();

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Original data for dirty check & reset
  const [originalData, setOriginalData] = useState<LearnerProfileData | null>(null);

  // Form states
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [dailyStudyTime, setDailyStudyTime] = useState<DailyStudyTime | null>(null);
  const [preferredLearningFormat, setPreferredLearningFormat] = useState<PreferredLearningFormat[]>([]);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setProfileNotFound(false);
    setLoadError(null);

    try {
      const data = await getLearnerProfile();
      setOriginalData(data);
      setInterests(data.interests || []);
      setGoals(data.goals || []);
      setExperienceLevel(data.experienceLevel || null);
      setDailyStudyTime(data.studyPreferences?.dailyStudyTime || null);
      setPreferredLearningFormat(
        (data.studyPreferences?.preferredLearningFormat as PreferredLearningFormat[]) || []
      );
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.status === 404 || err.code === 'LEARNER_PROFILE_NOT_FOUND') {
          setProfileNotFound(true);
        } else {
          setLoadError(err.message);
        }
      } else {
        setLoadError('Failed to load learner profile.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Tag management: Interests
  const handleAddInterest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newInterest.trim();
    if (val && !interests.includes(val)) {
      setInterests((prev) => [...prev, val]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (item: string) => {
    setInterests((prev) => prev.filter((i) => i !== item));
  };

  // Tag management: Goals
  const handleAddGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newGoal.trim();
    if (val && !goals.includes(val)) {
      setGoals((prev) => [...prev, val]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (item: string) => {
    setGoals((prev) => prev.filter((g) => g !== item));
  };

  // Checkbox toggle: Learning Formats
  const handleToggleFormat = (format: PreferredLearningFormat) => {
    setPreferredLearningFormat((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  // Dirty state calculation
  const isDirty = originalData
    ? JSON.stringify(interests) !== JSON.stringify(originalData.interests || []) ||
      JSON.stringify(goals) !== JSON.stringify(originalData.goals || []) ||
      experienceLevel !== (originalData.experienceLevel || null) ||
      dailyStudyTime !== (originalData.studyPreferences?.dailyStudyTime || null) ||
      JSON.stringify(preferredLearningFormat.slice().sort()) !==
        JSON.stringify(
          ((originalData.studyPreferences?.preferredLearningFormat as PreferredLearningFormat[]) || [])
            .slice()
            .sort()
        )
    : false;

  const handleReset = () => {
    if (!originalData) return;
    setInterests(originalData.interests || []);
    setGoals(originalData.goals || []);
    setExperienceLevel(originalData.experienceLevel || null);
    setDailyStudyTime(originalData.studyPreferences?.dailyStudyTime || null);
    setPreferredLearningFormat(
      (originalData.studyPreferences?.preferredLearningFormat as PreferredLearningFormat[]) || []
    );
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const payload: UpdateLearnerProfilePayload = {
      interests,
      goals,
      experienceLevel,
      studyPreferences: {
        dailyStudyTime,
        preferredLearningFormat,
      },
    };

    setIsSaving(true);
    try {
      const updated = await updateLearnerProfile(payload);
      setOriginalData(updated);
      setInterests(updated.interests || []);
      setGoals(updated.goals || []);
      setExperienceLevel(updated.experienceLevel || null);
      setDailyStudyTime(updated.studyPreferences?.dailyStudyTime || null);
      setPreferredLearningFormat(
        (updated.studyPreferences?.preferredLearningFormat as PreferredLearningFormat[]) || []
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to save learning profile changes.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render: Loading
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-xs flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-signal animate-spin" />
          <p className="text-xs text-text-secondary">Loading learning profile...</p>
        </div>
      </div>
    );
  }

  // Render: Missing Profile (404 recovery state)
  if (profileNotFound) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
        <div className="border-b border-border-muted pb-4 mb-6">
          <h2 className="text-xl font-display font-semibold text-text-primary">
            Learning Profile & Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Configure your personalized learning goals, topic interests, and daily study habits.
          </p>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning-soft/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Compass className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Learning Profile Not Yet Initialized
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                You haven&apos;t completed the onboarding questionnaire yet. Complete onboarding to unlock personalized course recommendations.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/onboarding')}
          >
            Start Onboarding
          </Button>
        </div>
      </div>
    );
  }

  // Render: Loading Error
  if (loadError) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
        <div className="border-b border-border-muted pb-4 mb-4">
          <h2 className="text-xl font-display font-semibold text-text-primary">
            Learning Profile & Preferences
          </h2>
        </div>
        <div className="rounded-xl border border-error/30 bg-error-soft/40 p-4 text-xs text-error flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {loadError}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchProfile}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
      <div className="border-b border-border-muted pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-display font-semibold text-text-primary">
            Learning Profile & Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Customize your learning goals, interests, and study routine.
          </p>
        </div>
        {isDirty && (
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-signal-soft text-signal border border-signal/20">
            Unsaved Changes
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Interests */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none">
            Topic Interests
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            Add topics or skills you want to explore (e.g. Python, Machine Learning, Data Structures).
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-elevated text-text-primary border border-border shadow-2xs"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  aria-label={`Remove interest ${interest}`}
                  className="h-3.5 w-3.5 rounded-full hover:bg-surface-disabled flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {interests.length === 0 && (
              <span className="text-xs text-text-disabled italic">No interests added yet.</span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInterest();
                }
              }}
              placeholder="Add an interest..."
              className="flex-1 px-3.5 py-2 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddInterest()}
              disabled={!newInterest.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Goals */}
        <div className="pt-4 border-t border-border-muted">
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none">
            Learning Goals
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            What do you hope to achieve? (e.g. Master algorithms, Career transition, Build portfolio).
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {goals.map((goal) => (
              <span
                key={goal}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-elevated text-text-primary border border-border shadow-2xs"
              >
                {goal}
                <button
                  type="button"
                  onClick={() => handleRemoveGoal(goal)}
                  aria-label={`Remove goal ${goal}`}
                  className="h-3.5 w-3.5 rounded-full hover:bg-surface-disabled flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {goals.length === 0 && (
              <span className="text-xs text-text-disabled italic">No goals added yet.</span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddGoal();
                }
              }}
              placeholder="Add a learning goal..."
              className="flex-1 px-3.5 py-2 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddGoal()}
              disabled={!newGoal.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Experience Level */}
        <div className="pt-4 border-t border-border-muted">
          <label
            htmlFor="learner-experience-level"
            className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none"
          >
            Experience Level
          </label>
          <div className="max-w-md">
            <select
              id="learner-experience-level"
              value={experienceLevel || ''}
              onChange={(e) =>
                setExperienceLevel(
                  e.target.value ? (e.target.value as ExperienceLevel) : null
                )
              }
              className="w-full px-3.5 py-2.5 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
            >
              <option value="">Select your experience level</option>
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Daily Study Time */}
        <div className="pt-4 border-t border-border-muted">
          <label
            htmlFor="learner-study-time"
            className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none"
          >
            Daily Study Time Commitment
          </label>
          <div className="max-w-md">
            <select
              id="learner-study-time"
              value={dailyStudyTime || ''}
              onChange={(e) =>
                setDailyStudyTime(
                  e.target.value ? (e.target.value as DailyStudyTime) : null
                )
              }
              className="w-full px-3.5 py-2.5 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
            >
              <option value="">Select typical study time per day</option>
              {DAILY_STUDY_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preferred Learning Formats */}
        <div className="pt-4 border-t border-border-muted">
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none">
            Preferred Learning Formats
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            Select the modalities you engage with best.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl">
            {PREFERRED_LEARNING_FORMATS.map((format) => {
              const checked = preferredLearningFormat.includes(format);
              return (
                <label
                  key={format}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                    checked
                      ? 'bg-signal-soft/40 border-signal text-text-primary'
                      : 'bg-surface-elevated border-border text-text-secondary hover:border-text-tertiary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleFormat(format)}
                    className="h-4 w-4 rounded border-border accent-signal cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  />
                  <span>{format}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error / Success Feedback */}
        {saveError && (
          <div className="rounded-xl border border-error/30 bg-error-soft/40 p-3 text-xs text-error flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-xl border border-sage/30 bg-sage-soft/40 p-3 text-xs text-sage flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>Learning profile updated successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border-muted">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSaving}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? 'Saving...' : 'Save Learning Profile'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isSaving || !isDirty}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LearnerProfileSection;
