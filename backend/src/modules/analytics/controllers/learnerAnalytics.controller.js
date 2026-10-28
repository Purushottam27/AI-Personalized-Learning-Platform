import {
    getLearnerDashboardService,
    getLearnerCourseProgressService,
    getLearnerAnalyticsOverviewService,
} from "../services/learnerAnalytics.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

/**
 * Learner retrieves unified personalized dashboard.
 * GET /api/v1/learning/me/dashboard
 */
export async function getLearnerDashboard(req, res) {
    const learnerId = req.user._id || req.user.id;
    const result = await getLearnerDashboardService(learnerId);

    res.status(200).json(
        new ApiResponse(result, "Learner dashboard retrieved successfully")
    );
}

/**
 * Learner retrieves course-level topic progress breakdown.
 * GET /api/v1/learning/me/courses/:courseId/progress
 */
export async function getLearnerCourseProgress(req, res) {
    const learnerId = req.user._id || req.user.id;
    const { courseId } = req.params;
    const result = await getLearnerCourseProgressService(learnerId, courseId);

    res.status(200).json(
        new ApiResponse(result, "Course progress retrieved successfully")
    );
}

/**
 * Learner retrieves deep analytics overview (activity totals, mastery distribution, trends).
 * GET /api/v1/learning/me/analytics/overview
 */
export async function getLearnerAnalyticsOverview(req, res) {
    const learnerId = req.user._id || req.user.id;
    const query = req.validatedQuery || req.query || {};
    const result = await getLearnerAnalyticsOverviewService(learnerId, {
        days: query.days,
    });

    res.status(200).json(
        new ApiResponse(result, "Learner analytics overview retrieved successfully")
    );
}
