import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    createResourceSchema,
    updateResourceSchema,
    resourceIdSchema,
    reorderResourcesSchema
} from "./resource.validation.js";

function parseOrThrow(schema, data, errorMessage) {
    const result = schema.safeParse(data);

    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", errorMessage, result.error.flatten());
    }

    return result.data;
}

export function validateResource(req, res, next) {
    req.body = parseOrThrow(createResourceSchema, req.body, "Invalid request body");
    next();
}

export function validateResourceUpdates(req, res, next) {
    req.body = parseOrThrow(updateResourceSchema, req.body, "Invalid request body");
    next();
}

export function validateResourceId(req, res, next) {
    req.params = parseOrThrow(resourceIdSchema, req.params, "Invalid path parameters");
    next();
}

export function validateResourceReorder(req, res, next) {
    req.body = parseOrThrow(reorderResourcesSchema, req.body, "Invalid request body");
    next();
}

