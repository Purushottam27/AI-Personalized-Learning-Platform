import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    getMyLearningEvidence,
    getCourseLearningEvidence,
    getLearningEvidenceById,
} from "../controllers/learningEvidence.controller.js";
import {
    validateLearnerEvidenceQuery,
    validateInstructorEvidenceQuery,
    validateEvidenceIdParam,
    validateCourseIdParam,
} from "../validations/learningEvidence.validation.middleware.js";

const learningEvidenceRouter = Router();

learningEvidenceRouter.use(authMiddleware);

// Learner can list their own evidence
learningEvidenceRouter.get(
    "/learning-evidence/me",
    roleMiddleware("LEARNER"),
    validateLearnerEvidenceQuery,
    getMyLearningEvidence
);

// Single evidence record (learner or instructor ownership verified in service)
learningEvidenceRouter.get(
    "/learning-evidence/:evidenceId",
    validateEvidenceIdParam,
    getLearningEvidenceById
);

// Instructor can list evidence for courses they own
learningEvidenceRouter.get(
    "/courses/:courseId/learning-evidence",
    roleMiddleware("INSTRUCTOR"),
    validateCourseIdParam,
    validateInstructorEvidenceQuery,
    getCourseLearningEvidence
);

export { learningEvidenceRouter };
