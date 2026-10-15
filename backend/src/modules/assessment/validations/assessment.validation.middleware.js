import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    createAssessmentSchema,
    updateAssessmentSchema,
    assessmentIdSchema,
    assessmentCourseIdSchema,
    assessmentTopicIdSchema,
} from "./assessment.validation.js";

function parseOrThrow(schema, data, message) {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", message, result.error.flatten());
    }
    return result.data;
}

export function validateCreateAssessment(req, res, next) {
    req.body = parseOrThrow(createAssessmentSchema, req.body, "Invalid request body");
    next();
}

export function validateUpdateAssessment(req, res, next) {
    req.body = parseOrThrow(updateAssessmentSchema, req.body, "Invalid request body");
    next();
}

export function validateAssessmentId(req, res, next) {
    req.params = parseOrThrow(assessmentIdSchema, req.params, "Invalid path parameters");
    next();
}

export function validateAssessmentCourseId(req, res, next) {
    req.params = parseOrThrow(assessmentCourseIdSchema, req.params, "Invalid path parameters");
    next();
}

export function validateAssessmentTopicId(req, res, next) {
    req.params = parseOrThrow(assessmentTopicIdSchema, req.params, "Invalid path parameters");
    next();
}
