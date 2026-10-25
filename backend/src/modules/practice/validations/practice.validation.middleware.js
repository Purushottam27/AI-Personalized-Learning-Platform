
import { ApiError } from "../../../shared/errors/ApiError.js";

import {
    createPracticeSchema,
    updatePracticeSchema,
    practiceIdSchema,
    topicIdSchema,
    courseIdSchema,
} from "./practice.validation.js";

function parseOrThrow(schema, data, errorMessage) {
    const result = schema.safeParse(data);

    if (!result.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            errorMessage,
            result.error.flatten()
        );
    }

    return result.data;
}

export function validateCreatePractice(req, res, next) {
    req.body = parseOrThrow(
        createPracticeSchema,
        req.body,
        "Invalid request body"
    );

    next();
}

export function validateUpdatePractice(req, res, next) {
    req.body = parseOrThrow(
        updatePracticeSchema,
        req.body,
        "Invalid request body"
    );

    next();
}

export function validatePracticeId(req, res, next) {
    req.params = parseOrThrow(
        practiceIdSchema,
        req.params,
        "Invalid path parameters"
    );

    next();
}

export function validatePracticeTopicId(req, res, next) {
    req.params = parseOrThrow(
        topicIdSchema,
        req.params,
        "Invalid path parameters"
    );

    next();
}

export function validatePracticeCourseId(req, res, next) {
    req.params = parseOrThrow(
        courseIdSchema,
        req.params,
        "Invalid path parameters"
    );

    next();
}

