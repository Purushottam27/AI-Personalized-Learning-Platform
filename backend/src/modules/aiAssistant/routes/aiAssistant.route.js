import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import { askAssistant } from "../controllers/aiAssistant.controller.js";
import { validateAskAssistantBody } from "../validations/aiAssistant.validation.middleware.js";

const aiAssistantRouter = Router();

aiAssistantRouter.use(authMiddleware);

// Learner asks the AI Assistant a question (with optional grounded course/topic/lesson context)
aiAssistantRouter.post(
    "/learning/me/assistant/ask",
    roleMiddleware("LEARNER"),
    validateAskAssistantBody,
    askAssistant
);

export { aiAssistantRouter };
