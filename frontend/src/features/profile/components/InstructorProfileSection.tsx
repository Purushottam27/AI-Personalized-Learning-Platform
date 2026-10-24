/**
 * InstructorProfileSection.tsx
 *
 * Editable section for Instructor Profile:
 * - Professional Title
 * - Organization
 * - Experience Years
 * - Expertise Areas (tag chips)
 * - Bio
 * - Social Links (URL validated, empty values stripped)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Check, AlertCircle, RefreshCw, Compass } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type {
  InstructorProfileData,
  UpdateInstructorProfilePayload,
} from '../types/profile.types';
import { getInstructorProfile, updateInstructorProfile } from '../api/profile.api';
import { isApiError } from '../../../lib/axios';

const COMMON_SOCIAL_PLATFORMS = [
  { key: 'website', label: 'Personal Website', placeholder: 'https://yourwebsite.com' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/username' },
];

export const InstructorProfileSection: React.FC = () => {
  const navigate = useNavigate();

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Original data for reset and dirty checking
  const [originalData, setOriginalData] = useState<InstructorProfileData | null>(null);

  // Form states
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [experienceYears, setExperienceYears] = useState<string>('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    website: '',
    github: '',
    linkedin: '',
    twitter: '',
  });

  // Action & Validation states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  const fetchProfile = async () => {
    setIsLoading(true);
    setProfileNotFound(false);
    setLoadError(null);

    try {
      const data = await getInstructorProfile();
      setOriginalData(data);
      setProfessionalTitle(data.professionalTitle || '');
      setOrganization(data.organization || '');
      setExperienceYears(
        data.experienceYears !== null && data.experienceYears !== undefined
          ? String(data.experienceYears)
          : ''
      );
      setExpertiseAreas(data.expertiseAreas || []);
      setBio(data.bio || '');

      const initialLinks: Record<string, string> = {
        website: '',
        github: '',
        linkedin: '',
        twitter: '',
        ...(data.socialLinks || {}),
      };
      setSocialLinks(initialLinks);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.status === 404 || err.code === 'INSTRUCTOR_PROFILE_NOT_FOUND') {
          setProfileNotFound(true);
        } else {
          setLoadError(err.message);
        }
      } else {
        setLoadError('Failed to load instructor profile.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Tag management: Expertise Areas
  const handleAddExpertise = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newExpertise.trim();
    if (val && !expertiseAreas.includes(val)) {
      setExpertiseAreas((prev) => [...prev, val]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertiseAreas((prev) => prev.filter((i) => i !== item));
  };

  // Social link change
  const handleSocialChange = (platform: string, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
    if (socialErrors[platform]) {
      setSocialErrors((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
    }
  };

  // URL validator
  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Check if form is dirty
  const isDirty = originalData
    ? professionalTitle !== (originalData.professionalTitle || '') ||
      organization !== (originalData.organization || '') ||
      experienceYears !==
        (originalData.experienceYears !== null && originalData.experienceYears !== undefined
          ? String(originalData.experienceYears)
          : '') ||
      JSON.stringify(expertiseAreas) !== JSON.stringify(originalData.expertiseAreas || []) ||
      bio !== (originalData.bio || '') ||
      JSON.stringify(
        Object.fromEntries(
          Object.entries(socialLinks)
            .map(([k, v]) => [k, v.trim()])
            .filter(([, v]) => v.length > 0)
        )
      ) !==
        JSON.stringify(
          Object.fromEntries(
            Object.entries(originalData.socialLinks || {})
              .map(([k, v]) => [k, v.trim()])
              .filter(([, v]) => v.length > 0)
          )
        )
    : false;

  const handleReset = () => {
    if (!originalData) return;
    setProfessionalTitle(originalData.professionalTitle || '');
    setOrganization(originalData.organization || '');
    setExperienceYears(
      originalData.experienceYears !== null && originalData.experienceYears !== undefined
        ? String(originalData.experienceYears)
        : ''
    );
    setExpertiseAreas(originalData.expertiseAreas || []);
    setBio(originalData.bio || '');
    setSocialLinks({
      website: '',
      github: '',
      linkedin: '',
      twitter: '',
      ...(originalData.socialLinks || {}),
    });
    setSocialErrors({});
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    // Validate social links
    const newErrors: Record<string, string> = {};
    const sanitizedSocialLinks: Record<string, string> = {};

    Object.entries(socialLinks).forEach(([key, val]) => {
      const trimmed = val.trim();
      if (trimmed) {
        if (!isValidUrl(trimmed)) {
          newErrors[key] = 'Must be a valid URL starting with http:// or https://';
        } else {
          sanitizedSocialLinks[key] = trimmed;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setSocialErrors(newErrors);
      setSaveError('Please correct the highlighted URL errors before saving.');
      return;
    }

    // Parse experience years
    let parsedYears: number | null = null;
    if (experienceYears.trim() !== '') {
      const num = Number(experienceYears.trim());
      if (isNaN(num) || num < 0) {
        setSaveError('Experience years must be a valid number greater than or equal to 0.');
        return;
      }
      parsedYears = num;
    }

    const payload: UpdateInstructorProfilePayload = {
      professionalTitle: professionalTitle.trim() || null,
      organization: organization.trim() || null,
      experienceYears: parsedYears,
      expertiseAreas,
      bio: bio.trim() || null,
      socialLinks: sanitizedSocialLinks,
    };

    setIsSaving(true);
    try {
      const updated = await updateInstructorProfile(payload);
      setOriginalData(updated);
      setProfessionalTitle(updated.professionalTitle || '');
      setOrganization(updated.organization || '');
      setExperienceYears(
        updated.experienceYears !== null && updated.experienceYears !== undefined
          ? String(updated.experienceYears)
          : ''
      );
      setExpertiseAreas(updated.expertiseAreas || []);
      setBio(updated.bio || '');
      setSocialLinks({
        website: '',
        github: '',
        linkedin: '',
        twitter: '',
        ...(updated.socialLinks || {}),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to update instructor profile.');
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
          <p className="text-xs text-text-secondary">Loading instructor profile...</p>
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
            Instructor Teaching Profile
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Showcase your academic credentials, teaching experience, and professional domains.
          </p>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning-soft/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Compass className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Instructor Profile Not Yet Initialized
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                You haven&apos;t completed the instructor onboarding yet. Complete onboarding to publish courses and establish your instructor credentials.
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
            Instructor Teaching Profile
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
            Instructor Teaching Profile
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Display your professional credentials, expertise domains, and social links to learners.
          </p>
        </div>
        {isDirty && (
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-signal-soft text-signal border border-signal/20">
            Unsaved Changes
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Professional Title & Organization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="instructor-title"
            label="Professional Title"
            value={professionalTitle}
            onChange={(e) => setProfessionalTitle(e.target.value)}
            placeholder="e.g. Senior Lecturer, Full-Stack Architect"
          />

          <Input
            id="instructor-org"
            label="Organization / University"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Stanford University, Google"
          />
        </div>

        {/* Experience Years */}
        <div className="max-w-xs">
          <Input
            id="instructor-years"
            label="Years of Experience"
            type="number"
            min="0"
            step="1"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            placeholder="e.g. 8"
          />
        </div>

        {/* Expertise Areas */}
        <div className="pt-4 border-t border-border-muted">
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none">
            Expertise Domains
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            Add subject areas or technologies you teach (e.g. Distributed Systems, React, Deep Learning).
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {expertiseAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-elevated text-text-primary border border-border shadow-2xs"
              >
                {area}
                <button
                  type="button"
                  onClick={() => handleRemoveExpertise(area)}
                  aria-label={`Remove expertise ${area}`}
                  className="h-3.5 w-3.5 rounded-full hover:bg-surface-disabled flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {expertiseAreas.length === 0 && (
              <span className="text-xs text-text-disabled italic">No expertise areas added yet.</span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newExpertise}
              onChange={(e) => setNewExpertise(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExpertise();
                }
              }}
              placeholder="Add an expertise domain..."
              className="flex-1 px-3.5 py-2 rounded-lg text-sm font-sans bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddExpertise()}
              disabled={!newExpertise.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Bio */}
        <div className="pt-4 border-t border-border-muted">
          <label
            htmlFor="instructor-bio"
            className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none"
          >
            Biography & Teaching Philosophy
          </label>
          <textarea
            id="instructor-bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a short bio with prospective learners highlighting your background, research interests, and teaching approach..."
            className="w-full px-4 py-3 rounded-xl text-sm font-sans bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 outline-none"
          />
        </div>

        {/* Social Links */}
        <div className="pt-4 border-t border-border-muted">
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5 select-none">
            Social & Professional Links
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            Provide links to your professional profiles and personal website.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMMON_SOCIAL_PLATFORMS.map((platform) => (
              <Input
                key={platform.key}
                id={`social-${platform.key}`}
                label={platform.label}
                value={socialLinks[platform.key] || ''}
                onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                error={socialErrors[platform.key]}
              />
            ))}
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
            <span>Instructor profile updated successfully!</span>
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
            {isSaving ? 'Saving...' : 'Save Instructor Profile'}
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

export default InstructorProfileSection;
