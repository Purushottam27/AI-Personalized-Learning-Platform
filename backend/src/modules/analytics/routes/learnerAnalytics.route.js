import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    getLearnerDashboard,
    getLearnerCourseProgress,
    getLearnerAnalyticsOverview,
} from "../controllers/learnerAnalytics.controller.js";
import {
    validateCourseIdParam,
    validateAnalyticsQuery,
} from "../validations/analytics.validation.middleware.js";

const learnerAnalyticsRouter = Router();

learnerAnalyticsRouter.use(authMiddleware);

// GET /api/v1/learning/me/dashboard
learnerAnalyticsRouter.get(
    "/learning/me/dashboard",
    roleMiddleware("LEARNER"),
    getLearnerDashboard
);

// GET /api/v1/learning/me/courses/:courseId/progress
learnerAnalyticsRouter.get(
    "/learning/me/courses/:courseId/progress",
    roleMiddleware("LEARNER"),
    validateCourseIdParam,
    getLearnerCourseProgress
);

// GET /api/v1/learning/me/analytics/overview
learnerAnalyticsRouter.get(
    "/learning/me/analytics/overview",
    roleMiddleware("LEARNER"),
    validateAnalyticsQuery,
    getLearnerAnalyticsOverview
);

export { learnerAnalyticsRouter };
