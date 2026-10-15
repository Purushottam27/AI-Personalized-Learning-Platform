import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    validateCreateAssessment,
    validateUpdateAssessment,
    validateAssessmentId,
    validateAssessmentCourseId,
    validateAssessmentTopicId,
} from "../validations/assessment.validation.middleware.js";
import {
    createAssessment,
    getAssessmentsByCourse,
    getAssessmentsByTopic,
    getAssessmentById,
    updateAssessment,
    publishAssessment,
    archiveAssessment,
    restoreAssessment,
} from "../controllers/assessment.controller.js";

const assessmentRouter = Router();
assessmentRouter.use(authMiddleware);
assessmentRouter.use(roleMiddleware("INSTRUCTOR"));

assessmentRouter.post("/assessments", validateCreateAssessment, createAssessment);
assessmentRouter.get("/courses/:courseId/assessments", validateAssessmentCourseId, getAssessmentsByCourse);
assessmentRouter.get("/topics/:topicId/assessments", validateAssessmentTopicId, getAssessmentsByTopic);
assessmentRouter.get("/assessments/:assessmentId", validateAssessmentId, getAssessmentById);
assessmentRouter.patch("/assessments/:assessmentId", validateAssessmentId, validateUpdateAssessment, updateAssessment);
assessmentRouter.post("/assessments/:assessmentId/publish", validateAssessmentId, publishAssessment);
assessmentRouter.post("/assessments/:assessmentId/archive", validateAssessmentId, archiveAssessment);
assessmentRouter.post("/assessments/:assessmentId/restore", validateAssessmentId, restoreAssessment);

export { assessmentRouter };
