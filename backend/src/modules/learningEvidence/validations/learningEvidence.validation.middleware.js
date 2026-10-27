import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    learnerEvidenceQuerySchema,
    instructorEvidenceQuerySchema,
    evidenceIdParamSchema,
    courseIdParamSchema,
} from "./learningEvidence.validation.js";

export function validateLearnerEvidenceQuery(req, res, next) {
    const result = learnerEvidenceQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
    next();
}

export function validateInstructorEvidenceQuery(req, res, next) {
    const result = instructorEvidenceQuerySchema.safeParse(req.query);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.format());
    }
    req.validatedQuery = result.data;
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

export function validateEvidenceIdParam(req, res, next) {
    const result = evidenceIdParamSchema.safeParse(req.params);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid path parameters", result.error.format());
    }
    req.params = result.data;
    next();
}
