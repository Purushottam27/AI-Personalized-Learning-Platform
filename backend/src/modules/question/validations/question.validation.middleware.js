import { ApiError } from "../../../shared/errors/ApiError.js";

import {
    createQuestionSchema,
    updateQuestionSchema,
    questionIdSchema,
    questionBankIdSchema
} from "./question.validation.js";

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

export function validateCreateQuestion(req, res, next) {
    req.body = parseOrThrow(
        createQuestionSchema,
        req.body,
        "Invalid request body"
    );

    next();
}

export function validateUpdateQuestion(req, res, next) {
    req.body = parseOrThrow(
        updateQuestionSchema,
        req.body,
        "Invalid request body"
    );

    next();
}

export function validateQuestionId(req, res, next) {
    req.params = parseOrThrow(
        questionIdSchema,
        req.params,
        "Invalid path parameters"
    );

    next();
}

export function validateQuestionBankId(req, res, next) {
    req.params = parseOrThrow(
        questionBankIdSchema,
        req.params,
        "Invalid path parameters"
    );

    next();
}