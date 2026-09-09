import { ApiResponse } from '../../../shared/responses/ApiResponse.js';
import { getInstructorProfileService, updateInstructorProfileService, updateInstructorOnboardingService } from '../services/instructorProfile.service.js';

const getInstructorProfile = async (req, res) => {
    const currentUserId = req.user?._id;

    const profile = await getInstructorProfileService(currentUserId);

    return res.status(200).json(
        new ApiResponse(profile, 'Instructor profile fetched successfully')
    );
};

const updateInstructorProfile = async (req, res) => {
    const currentUserId = req.user?._id;

    const updatedProfile = await updateInstructorProfileService(currentUserId, req.body);

    return res.status(200).json(
        new ApiResponse(updatedProfile, 'Instructor profile updated successfully')
    );
};

const updateInstructorOnboarding = async (req, res) => {
    const currentUserId = req.user?._id;

    const updatedProfile = await updateInstructorOnboardingService(currentUserId, req.body);

    return res.status(200).json(
        new ApiResponse(updatedProfile, 'Instructor onboarding step saved successfully')
    );
};

export {
    getInstructorProfile,
    updateInstructorProfile,
    updateInstructorOnboarding
};
