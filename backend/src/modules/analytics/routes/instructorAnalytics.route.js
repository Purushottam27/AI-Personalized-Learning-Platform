import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import { getInstructorCourseAnalytics } from "../controllers/instructorAnalytics.controller.js";
import {
    validateCourseIdParam,
    validateInstructorAnalyticsQuery,
} from "../validations/analytics.validation.middleware.js";

const instructorAnalyticsRouter = Router();

instructorAnalyticsRouter.use(authMiddleware);

// GET /api/v1/instructor/courses/:courseId/analytics
instructorAnalyticsRouter.get(
    "/instructor/courses/:courseId/analytics",
    roleMiddleware("INSTRUCTOR"),
    validateCourseIdParam,
    validateInstructorAnalyticsQuery,
    getInstructorCourseAnalytics
);

export { instructorAnalyticsRouter };

