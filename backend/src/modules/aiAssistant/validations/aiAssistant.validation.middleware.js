import { ApiError } from "../../../shared/errors/ApiError.js";
import { askAiAssistantBodySchema, createConversationSchema, renameConversationSchema } from "./aiAssistant.validation.js";

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", result.error.format());
    req.validatedBody = result.data;
    next();
};

export const validateAskAssistantBody = validate(askAiAssistantBodySchema);
export const validateCreateConversationBody = validate(createConversationSchema);
export const validateRenameConversationBody = validate(renameConversationSchema);
