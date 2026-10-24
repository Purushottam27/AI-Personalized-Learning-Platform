import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    validateAttemptAssessmentId,
    validateAttemptId,
    validateAttemptQuestionParams,
    validateSaveAttemptAnswer,
    validateSubmitAttempt,
} from "../validations/assessmentAttempt.validation.middleware.js";
import {
    startAssessmentAttempt,
    saveAssessmentAnswer,
    submitAssessmentAttempt,
    getAssessmentAttempt,
    getAssessmentAttemptHistory,
} from "../controllers/assessmentAttempt.controller.js";

const assessmentAttemptRouter = Router();

assessmentAttemptRouter.post("/assessments/:assessmentId/attempts", authMiddleware, roleMiddleware("LEARNER"), validateAttemptAssessmentId, startAssessmentAttempt);
assessmentAttemptRouter.get("/assessments/:assessmentId/attempts", authMiddleware, roleMiddleware("LEARNER"), validateAttemptAssessmentId, getAssessmentAttemptHistory);
assessmentAttemptRouter.get("/assessment-attempts/:attemptId", authMiddleware, roleMiddleware("LEARNER"), validateAttemptId, getAssessmentAttempt);
assessmentAttemptRouter.put("/assessment-attempts/:attemptId/questions/:questionId/answer", authMiddleware, roleMiddleware("LEARNER"), validateAttemptQuestionParams, validateSaveAttemptAnswer, saveAssessmentAnswer);
assessmentAttemptRouter.post("/assessment-attempts/:attemptId/submit", authMiddleware, roleMiddleware("LEARNER"), validateAttemptId, validateSubmitAttempt, submitAssessmentAttempt);

export { assessmentAttemptRouter };
