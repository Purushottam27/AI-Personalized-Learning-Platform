import { ApiError } from "../../../shared/errors/ApiError.js";
import { askAiAssistantBodySchema } from "./aiAssistant.validation.js";

export function validateAskAssistantBody(req, res, next) {
    const result = askAiAssistantBodySchema.safeParse(req.body);
    if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", result.error.format());
    }
    req.validatedBody = result.data;
    next();
}
