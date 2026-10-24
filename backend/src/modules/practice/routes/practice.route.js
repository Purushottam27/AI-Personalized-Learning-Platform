
import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import {
    validateCreatePractice,
    validateUpdatePractice,
    validatePracticeId,
    validatePracticeTopicId
} from "../validations/practice.validation.middleware.js";

import {
    createPractice,
    getPracticesByTopic,
    getPracticeById,
    updatePractice,
    publishPractice,
    archivePractice,
    restorePractice
} from "../controllers/practice.controller.js";

const practiceRouter = Router();

practiceRouter.post(
    "/topics/:topicId/practices",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeTopicId,
    validateCreatePractice,
    createPractice
);

practiceRouter.get(
    "/topics/:topicId/practices",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeTopicId,
    getPracticesByTopic
);

practiceRouter.get(
    "/practices/:practiceId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validatePracticeId,
    getPracticeById
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

export { practiceRouter };
