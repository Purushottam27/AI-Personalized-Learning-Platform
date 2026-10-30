import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import {
    getInstructorCourseAnalytics,
    getInstructorAssessmentAnalytics,
    getInstructorQuestionAnalytics,
} from "../controllers/instructorAnalytics.controller.js";
import {
    validateCourseIdParam,
    validateInstructorAnalyticsQuery,
    validateAssessmentIdParam,
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

// GET /api/v1/instructor/courses/:courseId/assessments/analytics
instructorAnalyticsRouter.get(
    "/instructor/courses/:courseId/assessments/analytics",
    roleMiddleware("INSTRUCTOR"),
    validateCourseIdParam,
    getInstructorAssessmentAnalytics
);

// GET /api/v1/instructor/assessments/:assessmentId/questions/analytics
instructorAnalyticsRouter.get(
    "/instructor/assessments/:assessmentId/questions/analytics",
    roleMiddleware("INSTRUCTOR"),
    validateAssessmentIdParam,
    getInstructorQuestionAnalytics
);

export { instructorAnalyticsRouter };


