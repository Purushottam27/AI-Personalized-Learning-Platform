import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    courseIdParamSchema,
    analyticsOverviewQuerySchema,
    instructorAnalyticsQuerySchema,
    assessmentIdParamSchema,
} from "./analytics.validation.js";

export function validateCourseIdParam(req, res, next) {
    const result = courseIdParamSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = result.data;
    next();
}

export function validateAssessmentIdParam(req, res, next) {
    const result = assessmentIdParamSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = { ...req.params, ...result.data };
    next();
}

export function validateAnalyticsQuery(req, res, next) {
    const result = analyticsOverviewQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}

export function validateInstructorAnalyticsQuery(req, res, next) {
    const result = instructorAnalyticsQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}
