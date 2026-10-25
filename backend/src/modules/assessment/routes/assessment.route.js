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
    getCourseDiagnosticAssessment,
} from "../controllers/assessment.controller.js";

const assessmentRouter = Router();

// Learner diagnostic discovery
assessmentRouter.get("/courses/:courseId/diagnostic", authMiddleware, roleMiddleware("LEARNER"), validateAssessmentCourseId, getCourseDiagnosticAssessment);
assessmentRouter.get("/courses/:courseId/assessments/diagnostic", authMiddleware, roleMiddleware("LEARNER"), validateAssessmentCourseId, getCourseDiagnosticAssessment);

assessmentRouter.post("/assessments", authMiddleware, roleMiddleware("INSTRUCTOR"), validateCreateAssessment, createAssessment);
assessmentRouter.get("/courses/:courseId/assessments", authMiddleware, validateAssessmentCourseId, getAssessmentsByCourse);
assessmentRouter.get("/topics/:topicId/assessments", authMiddleware, validateAssessmentTopicId, getAssessmentsByTopic);
assessmentRouter.get("/assessments/:assessmentId", authMiddleware, validateAssessmentId, getAssessmentById);
assessmentRouter.patch("/assessments/:assessmentId", authMiddleware, roleMiddleware("INSTRUCTOR"), validateAssessmentId, validateUpdateAssessment, updateAssessment);
assessmentRouter.post("/assessments/:assessmentId/publish", authMiddleware, roleMiddleware("INSTRUCTOR"), validateAssessmentId, publishAssessment);
assessmentRouter.post("/assessments/:assessmentId/archive", authMiddleware, roleMiddleware("INSTRUCTOR"), validateAssessmentId, archiveAssessment);
assessmentRouter.post("/assessments/:assessmentId/restore", authMiddleware, roleMiddleware("INSTRUCTOR"), validateAssessmentId, restoreAssessment);

export { assessmentRouter };
