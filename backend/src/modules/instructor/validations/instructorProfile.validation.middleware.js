import { updateInstructorProfileSchema, instructorOnboardingSchema } from '../validations/instructorProfile.validation.js';
import { ApiError } from '../../../shared/errors/ApiError.js';

const validateUpdateInstructorProfile = (req, res, next) => {
    const result = updateInstructorProfileSchema.safeParse(req?.body);

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

const validateInstructorOnboarding = (req, res, next) => {
    const result = instructorOnboardingSchema.safeParse(req?.body);

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
    validateUpdateInstructorProfile,
    validateInstructorOnboarding
};
