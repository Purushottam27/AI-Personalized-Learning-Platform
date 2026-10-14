
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

practiceRouter.use(authMiddleware);
practiceRouter.use(roleMiddleware("INSTRUCTOR"));

practiceRouter.post(
    "/topics/:topicId/practices",
    validatePracticeTopicId,
    validateCreatePractice,
    createPractice
);

practiceRouter.get(
    "/topics/:topicId/practices",
    validatePracticeTopicId,
    getPracticesByTopic
);

practiceRouter.get(
    "/practices/:practiceId",
    validatePracticeId,
    getPracticeById
);

practiceRouter.patch(
    "/practices/:practiceId",
    validatePracticeId,
    validateUpdatePractice,
    updatePractice
);

practiceRouter.post(
    "/practices/:practiceId/publish",
    validatePracticeId,
    publishPractice
);

practiceRouter.post(
    "/practices/:practiceId/archive",
    validatePracticeId,
    archivePractice
);

practiceRouter.post(
    "/practices/:practiceId/restore",
    validatePracticeId,
    restorePractice
);

export { practiceRouter };
