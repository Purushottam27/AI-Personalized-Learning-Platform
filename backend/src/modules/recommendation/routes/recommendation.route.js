import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    getLearnerRecommendations,
    getLearnerCourseRecommendations,
} from "../controllers/recommendation.controller.js";
import {
    validateCourseIdParam,
    validateRecommendationsQuery,
} from "../validations/recommendation.validation.middleware.js";

const recommendationRouter = Router();

recommendationRouter.use(authMiddleware);

// Learner retrieves general personalized recommendations across enrolled courses
recommendationRouter.get(
    "/learning/me/recommendations",
    roleMiddleware("LEARNER"),
    validateRecommendationsQuery,
    getLearnerRecommendations
);

// Learner retrieves recommendations for a specific enrolled course
recommendationRouter.get(
    "/learning/me/courses/:courseId/recommendations",
    roleMiddleware("LEARNER"),
    validateCourseIdParam,
    validateRecommendationsQuery,
    getLearnerCourseRecommendations
);

export { recommendationRouter };
