import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    attemptAssessmentIdSchema,
    attemptIdSchema,
    attemptQuestionParamsSchema,
    saveAttemptAnswerSchema,
    submitAttemptSchema,
} from "./assessmentAttempt.validation.js";

function parseOrThrow(schema, data, message) {
    const result = schema.safeParse(data);
    if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", message, result.error.flatten());
    return result.data;
}
export function validateAttemptAssessmentId(req, res, next) {
    req.params = parseOrThrow(attemptAssessmentIdSchema, req.params, "Invalid path parameters");
    next();
}
export function validateAttemptId(req, res, next) {
    req.params = parseOrThrow(attemptIdSchema, req.params, "Invalid path parameters");
    next();
}
export function validateAttemptQuestionParams(req, res, next) {
    req.params = parseOrThrow(attemptQuestionParamsSchema, req.params, "Invalid path parameters");
    next();
}
export function validateSaveAttemptAnswer(req, res, next) {
    req.body = parseOrThrow(saveAttemptAnswerSchema, req.body, "Invalid answer payload");
    next();
}
export function validateSubmitAttempt(req, res, next) {
    req.body = parseOrThrow(submitAttemptSchema, req.body ?? {}, "Invalid submission payload");
    next();
}
