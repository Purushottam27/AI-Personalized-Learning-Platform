import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    createQuestionBankSchema,
    updateQuestionBankSchema,
    questionBankIdSchema,
    topicIdSchema,   
} from "./questionBank.validation.js";

function parseOrThrow(schema, data, errorMessage) {
    const result = schema.safeParse(data);

    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", errorMessage, result.error.flatten());
    }

    return result.data;
}

export function validateCreateQuestionBank(req, res, next) {
    req.body = parseOrThrow(createQuestionBankSchema, req.body, "Invalid request body");
    next();
}

export function validateUpdateQuestionBank(req, res, next) {
    req.body = parseOrThrow(updateQuestionBankSchema, req.body, "Invalid request body");
    next();
}

export function validateQuestionBankId(req, res, next) {
    req.params = parseOrThrow(questionBankIdSchema, req.params, "Invalid path parameters");
    next();
}

export function validateTopicId(req, res, next) {
    req.params = parseOrThrow(topicIdSchema, req.params, "Invalid path parameters");
    next();
}