import { LearnerProfile } from '../models/learnerProfile.model.js';
import { ApiError } from '../../../shared/errors/ApiError.js';

const getLearnerProfileService = async (userId) => {
    const profile = await LearnerProfile
        .findOne({ userId })
        .lean();

    if (!profile) {
        throw new ApiError(
            404,
            "LEARNER_PROFILE_NOT_FOUND",
            "Learner profile not found"
        );
    }

    return profile;
};

const updateLearnerProfileService = async (userId, updateData) => {
    const updateFields = {};

    if (updateData.interests !== undefined) {
        updateFields.interests = updateData.interests;
    }

    if (updateData.goals !== undefined) {
        updateFields.goals = updateData.goals;
    }

    if (updateData.experienceLevel !== undefined) {
        updateFields.experienceLevel = updateData.experienceLevel;
    }

    if (updateData.studyPreferences?.dailyStudyTime !== undefined) {
        updateFields["studyPreferences.dailyStudyTime"] = updateData.studyPreferences.dailyStudyTime;
    }

    if (updateData.studyPreferences?.preferredLearningFormat !== undefined) {
        updateFields["studyPreferences.preferredLearningFormat"] = updateData.studyPreferences.preferredLearningFormat;
    }

    const updatedProfile = await LearnerProfile.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedProfile) {
        throw new ApiError(
            404,
            "LEARNER_PROFILE_NOT_FOUND",
            "Learner profile not found"
        );
    }

    return updatedProfile.toObject();
};

const updateLearnerOnboardingService = async (userId, updateData) => {
    let profile = await LearnerProfile.findOne({ userId });

    if (!profile) {
        profile = new LearnerProfile({ userId });
    }

    if (updateData.interests !== undefined) {
        profile.interests = updateData.interests;
    }

    if (updateData.goals !== undefined) {
        profile.goals = updateData.goals;
    }

    if (updateData.experienceLevel !== undefined) {
        profile.experienceLevel = updateData.experienceLevel;
    }

    if (updateData.studyPreferences?.dailyStudyTime !== undefined) {
        if (!profile.studyPreferences) profile.studyPreferences = {};
        profile.studyPreferences.dailyStudyTime = updateData.studyPreferences.dailyStudyTime;
    }

    if (updateData.studyPreferences?.preferredLearningFormat !== undefined) {
        if (!profile.studyPreferences) profile.studyPreferences = {};
        profile.studyPreferences.preferredLearningFormat = updateData.studyPreferences.preferredLearningFormat;
    }

    // Calculate onboarding state
    const hasInterests = Array.isArray(profile.interests) && profile.interests.length > 0;
    const hasGoals = Array.isArray(profile.goals) && profile.goals.length > 0;
    const hasExperience = profile.experienceLevel !== null && profile.experienceLevel !== undefined;
    const hasDailyStudyTime = profile.studyPreferences?.dailyStudyTime !== null && profile.studyPreferences?.dailyStudyTime !== undefined;
    const hasPreferredFormat = Array.isArray(profile.studyPreferences?.preferredLearningFormat) && profile.studyPreferences.preferredLearningFormat.length > 0;

    const answersCount = [hasInterests, hasGoals, hasExperience, hasDailyStudyTime, hasPreferredFormat].filter(Boolean).length;

    if (answersCount === 5) {
        profile.onboardingState = 'COMPLETED';
    } else if (answersCount > 0) {
        profile.onboardingState = 'IN_PROGRESS';
    } else {
        profile.onboardingState = 'NOT_STARTED';
    }

    await profile.save();

    return profile.toObject();
};



export {
    getLearnerProfileService,
    updateLearnerProfileService,
    updateLearnerOnboardingService
};
