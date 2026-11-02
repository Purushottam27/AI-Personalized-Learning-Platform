import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    askAssistant, listAssistantChats, createAssistantChat, getAssistantChat,
    renameAssistantChat, deleteAssistantChat
} from "../controllers/aiAssistant.controller.js";
import {
    validateAskAssistantBody, validateCreateConversationBody, validateRenameConversationBody
} from "../validations/aiAssistant.validation.middleware.js";
import { aiAssistantRateLimit } from "../middleware/aiAssistantRateLimit.middleware.js";

const aiAssistantRouter = Router();
aiAssistantRouter.use(authMiddleware, roleMiddleware("LEARNER"));

aiAssistantRouter.get("/learning/me/assistant/conversations", listAssistantChats);
aiAssistantRouter.post("/learning/me/assistant/conversations", validateCreateConversationBody, createAssistantChat);
aiAssistantRouter.get("/learning/me/assistant/conversations/:conversationId", getAssistantChat);
aiAssistantRouter.patch("/learning/me/assistant/conversations/:conversationId", validateRenameConversationBody, renameAssistantChat);
aiAssistantRouter.delete("/learning/me/assistant/conversations/:conversationId", deleteAssistantChat);
aiAssistantRouter.post("/learning/me/assistant/ask", aiAssistantRateLimit, validateAskAssistantBody, askAssistant);

export { aiAssistantRouter };
