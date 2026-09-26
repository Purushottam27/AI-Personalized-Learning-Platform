import { ApiError } from "../../../shared/errors/ApiError.js";
import { validateEnrollmentIdSchema } from "./enrollment.validation.js";

const validateEnrollmentId = (req, res, next) => {
    const result = validateEnrollmentIdSchema.safeParse(req.params);

    if (!result.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid path parameters",
            result.error.format()
        );
    }

    req.params = result.data;

    next();
};

export { validateEnrollmentId };