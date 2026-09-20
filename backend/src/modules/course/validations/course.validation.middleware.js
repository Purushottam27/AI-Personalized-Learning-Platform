import { ApiError } from "../../../shared/errors/ApiError.js";
import { courseDiscoveryQuerySchema, courseIdSchema, createCourseSchema, updateCourseSchema } from "./course.validation.js";



const validateCourse = (req, res, next) => {
    const result = createCourseSchema.safeParse(req.body);

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

const validateUpdatedCourse = (req, res, next) => {
    const paramResult = courseIdSchema.safeParse(req.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid path parameters',
            paramResult.error.format()
        );
    }

    const bodyResult = updateCourseSchema.safeParse(req.body);

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

const validateCourseId = (req, res, next) => {
    const result = courseIdSchema.safeParse(req.params);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid path parameters',
            result.error.format()
        );
    }

    req.params = result.data;
    next();
};

const validateCourseQuery = (req, res, next) => {
    const result = courseDiscoveryQuerySchema.safeParse(req?.query);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid query parameters',
            result.error.format()
        );
    }

    req.validatedQuery = result.data;
    next();
};


export {
    validateCourse,
    validateUpdatedCourse,
    validateCourseId,
    validateCourseQuery,
}