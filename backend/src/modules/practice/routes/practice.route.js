
import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import {
    validateCreatePractice,
    validateUpdatePractice,
    validatePracticeId,
    validatePracticeTopicId,
    validatePracticeCourseId,
} from "../validations/practice.validation.middleware.js";

import {
    validatePracticeAttemptPracticeId,
    validatePracticeAttemptId,
    validatePracticeAttemptQuestionParams,
    validateSavePracticeAnswer,
    validateSubmitPracticeAttempt,
} from "../validations/practiceAttempt.validation.middleware.js";

import {
    createPractice,
    getPracticesByCourse,
    getPracticesByTopic,
    getPracticeById,
    updatePractice,
    publishPractice,
    archivePractice,
    restorePractice,
} from "../controllers/practice.controller.js";

import {
    startPracticeAttempt,
    savePracticeAnswer,
    submitPracticeAttempt,
    getPracticeAttempt,
    getPracticeAttemptHistory,
} from "../controllers/practiceAttempt.controller.js";

const practiceRouter = Router();

// Discovery routes (accessible by enrolled learners and instructors)
practiceRouter.get(
    "/courses/:courseId/practices",
    authMiddleware,
    validatePracticeCourseId,
    getPracticesByCourse
);

practiceRouter.get(
    "/topics/:topicId/practices",
    authMiddleware,
    validatePracticeTopicId,
    getPracticesByTopic
);

practiceRouter.get(
    "/practices/:practiceId",
    authMiddleware,
    validatePracticeId,
    getPracticeById
);

// Instructor-only authoring routes
practiceRouter.post(
    "/topics/:topicId/practices",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeTopicId,
    validateCreatePractice,
    createPractice
);

practiceRouter.patch(
    "/practices/:practiceId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeId,
    validateUpdatePractice,
    updatePractice
);

practiceRouter.post(
    "/practices/:practiceId/publish",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeId,
    publishPractice
);

practiceRouter.post(
    "/practices/:practiceId/archive",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeId,
    archivePractice
);

practiceRouter.post(
    "/practices/:practiceId/restore",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeId,
    restorePractice
);

// Learner practice attempt routes
practiceRouter.post(
    "/practices/:practiceId/attempts",
    authMiddleware,
    roleMiddleware("LEARNER"),
    validatePracticeAttemptPracticeId,
    startPracticeAttempt
);

practiceRouter.get(
    "/practices/:practiceId/attempts",
    authMiddleware,
    roleMiddleware("LEARNER"),
    validatePracticeAttemptPracticeId,
    getPracticeAttemptHistory
);

practiceRouter.get(
    "/practice-attempts/:attemptId",
    authMiddleware,
    roleMiddleware("LEARNER"),
    validatePracticeAttemptId,
    getPracticeAttempt
);

practiceRouter.put(
    "/practice-attempts/:attemptId/questions/:questionId/answer",
    authMiddleware,
    roleMiddleware("LEARNER"),
    validatePracticeAttemptQuestionParams,
    validateSavePracticeAnswer,
    savePracticeAnswer
);

practiceRouter.post(
    "/practice-attempts/:attemptId/submit",
    authMiddleware,
    roleMiddleware("LEARNER"),
    validatePracticeAttemptId,
    validateSubmitPracticeAttempt,
    submitPracticeAttempt
);

export { practiceRouter };

