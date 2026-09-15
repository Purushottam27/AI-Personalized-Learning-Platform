import { InstructorProfile } from '../models/instructorProfile.model.js';
import { ApiError } from '../../../shared/errors/ApiError.js';


const getInstructorProfileService = async (userId) => {
    const profile = await InstructorProfile.findOne({ userId }).lean();

    if (!profile) {
        throw new ApiError(404,"INSTRUCTOR_PROFILE_NOT_FOUND",'Instructor profile not found')
    }

    return profile;
};

const updateInstructorProfileService = async (userId, updateData) => {
    let profile = await InstructorProfile.findOne({ userId });

    if (!profile) {
        throw new ApiError(404,"INSTRUCTOR_PROFILE_NOT_FOUND",'Instructor profile not found')
    }
    
    if (updateData.professionalTitle !== undefined) {
        profile.professionalTitle = updateData.professionalTitle;
    }

    if (updateData.expertiseAreas !== undefined) {
        profile.expertiseAreas = updateData.expertiseAreas;
    }

    if (updateData.bio !== undefined) {
        profile.bio = updateData.bio;
    }

    if (updateData.experienceYears !== undefined) {
        profile.experienceYears = updateData.experienceYears;
    }

    if (updateData.organization !== undefined) {
        profile.organization = updateData.organization;
    }

    if (updateData.socialLinks !== undefined) {
        profile.socialLinks = new Map(
            Object.entries(updateData.socialLinks)
        );
    }

    await profile.save();
    
    return profile.toObject();
};

const updateInstructorOnboardingService = async (userId, updateData) => {
    let profile = await InstructorProfile.findOne({ userId });

    if (!profile) {
        profile = new InstructorProfile({ userId });
    }

    if (updateData.professionalTitle !== undefined) {
        profile.professionalTitle = updateData.professionalTitle;
    }

    if (updateData.expertiseAreas !== undefined) {
        profile.expertiseAreas = updateData.expertiseAreas;
    }

    const hasProfessionalTitle = profile.professionalTitle !== null && profile.professionalTitle !== undefined &&
        profile.professionalTitle.trim().length > 0

    const hasExpertiseAreas = Array.isArray(profile.expertiseAreas) && profile.expertiseAreas.length > 0

    const answersCount = [hasProfessionalTitle,hasExpertiseAreas].filter(Boolean).length

    if (answersCount === 2) {
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
    getInstructorProfileService,
    updateInstructorProfileService,
    updateInstructorOnboardingService
};
