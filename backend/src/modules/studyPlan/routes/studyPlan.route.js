import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    getStudyPreferences,
    updateStudyPreferences,
    getActivePlan,
    generatePlan,
    getPlanHistory,
    getPlanQuota,
    proposePlanRevision,
    acceptPlanRevision,
    chatAssistant,
    getAssistantMessages
} from "../controllers/studyPlan.controller.js";
import {
    updateStudyPreferencesSchema,
    assistantChatSchema,
    acceptRevisionSchema
} from "../validations/studyPlan.validation.js";

function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body", result.error.format());
        }
        req.body = result.data;
        next();
    };
}

const studyPlanRouter = Router();

studyPlanRouter.use(authMiddleware);
studyPlanRouter.use(roleMiddleware("LEARNER"));

// Study Preferences
studyPlanRouter.get("/learning/me/study-preferences", getStudyPreferences);
studyPlanRouter.patch("/learning/me/study-preferences", validateBody(updateStudyPreferencesSchema), updateStudyPreferences);

// Active Study Plan & Generation
studyPlanRouter.get("/learning/me/study-plan", getActivePlan);
studyPlanRouter.post("/learning/me/study-plan/generate", generatePlan);
studyPlanRouter.get("/learning/me/study-plan/quota", getPlanQuota);
studyPlanRouter.get("/learning/me/study-plan/history", getPlanHistory);

// Plan Revisions
studyPlanRouter.post("/learning/me/study-plan/propose-revision", proposePlanRevision);
studyPlanRouter.post("/learning/me/study-plan/accept-revision", validateBody(acceptRevisionSchema), acceptPlanRevision);

// Contextual Assistant
studyPlanRouter.post("/learning/me/study-assistant/chat", validateBody(assistantChatSchema), chatAssistant);
studyPlanRouter.get("/learning/me/study-assistant/messages", getAssistantMessages);

export { studyPlanRouter };

