import { updateLearnerProfileSchema, learnerOnboardingSchema } from '../validations/learnerProfile.validation.js';
import { ApiError } from '../../../shared/errors/ApiError.js';

const validateUpdateLearnerProfile = (req, res, next) => {
    const result = updateLearnerProfileSchema.safeParse(req?.body);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid request body',
            result.error.format()
        );
    }

    req.body = result.data;
    next();
};

const validateLearnerOnboarding = (req, res, next) => {
    const result = learnerOnboardingSchema.safeParse(req?.body);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid request body',
            result.error.format()
        );
    }

    req.body = result.data;
    next();
};

export {
    validateUpdateLearnerProfile,
    validateLearnerOnboarding
};
