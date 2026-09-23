import { ApiError } from "../../../shared/errors/ApiError.js";
import { validateCourseIdSchema, validateTopicIdSchema, validateTopicReorderSchema, validateTopicSchema, validateUpdateSchema } from "./topic.validation.js";



const validateTopic = (req, res, next) => {
    const result = validateTopicSchema.safeParse(req.body);

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

const validateTopicUpdates = (req, res, next) => {
    const paramResult = validateTopicIdSchema.safeParse(req.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid path parameters',
            paramResult.error.format()
        );
    }

    const bodyResult = validateUpdateSchema.safeParse(req.body);

    if (!bodyResult.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid request body',
            bodyResult.error.format()
        );
    }

    req.params = paramResult.data;
    req.body = bodyResult.data;
    next();
};

const validateTopicId = (req, res, next) => {
    const result = validateTopicIdSchema.safeParse(req.params);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            "Invalid path parameters",
            result.error.format()
        );
    }

    req.params = result.data;
    next();
};

const validateTopicReorder = (req, res, next) => {

    const paramResult = validateCourseIdSchema.safeParse(req.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid path parameters",
            paramResult.error.format()
        );
    }

    const bodyResult = validateTopicReorderSchema.safeParse(req.body);

    if (!bodyResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid request body",
            bodyResult.error.format()
        );
    }

    req.params = paramResult.data;
    req.body = bodyResult.data;

    next();
};

export {
    validateTopic,
    validateTopicId,
    validateTopicUpdates,
    validateTopicReorder
}