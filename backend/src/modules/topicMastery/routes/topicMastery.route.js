import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    getLearnerTopicMastery,
    getLearnerCourseMastery,
    getLearnerWeaknesses,
    recalculateLearnerTopicMastery,
    getInstructorTopicMastery,
} from "../controllers/topicMastery.controller.js";
import {
    validateTopicIdParam,
    validateCourseIdParam,
    validateCourseTopicParams,
    validateLearnerCourseMasteryQuery,
    validateLearnerWeaknessQuery,
    validateInstructorMasteryQuery,
} from "../validations/topicMastery.validation.middleware.js";

const topicMasteryRouter = Router();

topicMasteryRouter.use(authMiddleware);

// Learner reads own topic mastery
topicMasteryRouter.get(
    "/learning/me/topics/:topicId/mastery",
    roleMiddleware("LEARNER"),
    validateTopicIdParam,
    getLearnerTopicMastery
);

// Learner reads own course topic mastery
topicMasteryRouter.get(
    "/learning/me/courses/:courseId/mastery",
    roleMiddleware("LEARNER"),
    validateCourseIdParam,
    validateLearnerCourseMasteryQuery,
    getLearnerCourseMastery
);

// Learner reads own weak topics
topicMasteryRouter.get(
    "/learning/me/weaknesses",
    roleMiddleware("LEARNER"),
    validateLearnerWeaknessQuery,
    getLearnerWeaknesses
);

// Learner triggers recalculation of own topic mastery
topicMasteryRouter.post(
    "/learning/me/topics/:topicId/recalculate",
    roleMiddleware("LEARNER"),
    validateTopicIdParam,
    recalculateLearnerTopicMastery
);

// Instructor reads topic mastery for their owned course
topicMasteryRouter.get(
    "/courses/:courseId/topics/:topicId/mastery",
    roleMiddleware("INSTRUCTOR"),
    validateCourseTopicParams,
    validateInstructorMasteryQuery,
    getInstructorTopicMastery
);

export { topicMasteryRouter };
