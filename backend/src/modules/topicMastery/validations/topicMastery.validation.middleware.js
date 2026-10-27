import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    topicIdParamSchema,
    courseIdParamSchema,
    courseTopicParamsSchema,
    learnerCourseMasteryQuerySchema,
    learnerWeaknessQuerySchema,
    instructorMasteryQuerySchema,
} from "./topicMastery.validation.js";

export function validateTopicIdParam(req, res, next) {
    const result = topicIdParamSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = result.data;
    next();
}

export function validateCourseIdParam(req, res, next) {
    const result = courseIdParamSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = result.data;
    next();
}

export function validateCourseTopicParams(req, res, next) {
    const result = courseTopicParamsSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = result.data;
    next();
}

export function validateLearnerCourseMasteryQuery(req, res, next) {
    const result = learnerCourseMasteryQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}

export function validateLearnerWeaknessQuery(req, res, next) {
    const result = learnerWeaknessQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}

export function validateInstructorMasteryQuery(req, res, next) {
    const result = instructorMasteryQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}
