import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    practiceAttemptPracticeIdSchema,
    practiceAttemptIdSchema,
    practiceAttemptQuestionParamsSchema,
    savePracticeAnswerSchema,
    submitPracticeAttemptSchema,
} from "./practiceAttempt.validation.js";

function parseOrThrow(schema, data, message) {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", message, result.error.flatten());
    }
    return result.data;
}

export function validatePracticeAttemptPracticeId(req, res, next) {
    req.params = parseOrThrow(practiceAttemptPracticeIdSchema, req.params, "Invalid practice ID");
    next();
}

export function validatePracticeAttemptId(req, res, next) {
    req.params = parseOrThrow(practiceAttemptIdSchema, req.params, "Invalid practice attempt ID");
    next();
}

export function validatePracticeAttemptQuestionParams(req, res, next) {
    req.params = parseOrThrow(practiceAttemptQuestionParamsSchema, req.params, "Invalid practice attempt question parameters");
    next();
}

export function validateSavePracticeAnswer(req, res, next) {
    req.body = parseOrThrow(savePracticeAnswerSchema, req.body, "Invalid answer payload");
    next();
}

export function validateSubmitPracticeAttempt(req, res, next) {
    req.body = parseOrThrow(submitPracticeAttemptSchema, req.body ?? {}, "Invalid submission payload");
    next();
}
