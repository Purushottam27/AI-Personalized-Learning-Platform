import { ApiResponse } from '../../../shared/responses/ApiResponse.js';
import { getLearnerProfileService, updateLearnerProfileService, updateLearnerOnboardingService } from '../services/learnerProfile.service.js';

const getLearnerProfile = async (req, res) => {
    const currentUserId = req.user?._id;

    const profile = await getLearnerProfileService(currentUserId);

    return res.status(200).json(
        new ApiResponse(profile, 'Learner profile fetched successfully')
    );
};

const updateLearnerProfile = async (req, res) => {
    const currentUserId = req.user?._id;

    const updatedProfile = await updateLearnerProfileService(currentUserId, req.body);

    return res.status(200).json(
        new ApiResponse(updatedProfile, 'Learner profile updated successfully')
    );
};

const updateLearnerOnboarding = async (req, res) => {
    const currentUserId = req.user?._id;

    const updatedProfile = await updateLearnerOnboardingService(currentUserId, req.body);

    return res.status(200).json(
        new ApiResponse(updatedProfile, 'Learner onboarding step saved successfully')
    );
};

export {
    getLearnerProfile,
    updateLearnerProfile,
    updateLearnerOnboarding
};
