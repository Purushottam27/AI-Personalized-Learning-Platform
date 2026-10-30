import { ApiResponse } from "../../../shared/responses/ApiResponse.js";
import { getInstructorCourseAnalyticsService } from "../services/instructorAnalytics.service.js";
import {
    getInstructorAssessmentAnalyticsService,
    getInstructorQuestionAnalyticsService,
} from "../services/instructorAssessmentAnalytics.service.js";

/**
 * Controller for GET /api/v1/instructor/courses/:courseId/analytics
 * Retrieves aggregated course performance, topic mastery distributions, and learner breakdowns.
 */
export async function getInstructorCourseAnalytics(req, res) {
    const instructorId = req.user._id;
    const { courseId } = req.params;
    const query = req.validatedQuery || {};

    const analyticsData = await getInstructorCourseAnalyticsService(instructorId, courseId, query);

    return res.status(200).json(
        new ApiResponse(analyticsData, "Instructor course analytics fetched successfully")
    );
}

/**
 * Controller for GET /api/v1/instructor/courses/:courseId/assessments/analytics
 * Retrieves assessment-level performance statistics and actionable insights.
 */
export async function getInstructorAssessmentAnalytics(req, res) {
    const instructorId = req.user._id;
    const { courseId } = req.params;

    const data = await getInstructorAssessmentAnalyticsService(instructorId, courseId);

    return res.status(200).json(
        new ApiResponse(data, "Instructor assessment analytics fetched successfully")
    );
}

/**
 * Controller for GET /api/v1/instructor/assessments/:assessmentId/questions/analytics
 * Retrieves question-level response metrics and item insights.
 */
export async function getInstructorQuestionAnalytics(req, res) {
    const instructorId = req.user._id;
    const { assessmentId } = req.params;

    const data = await getInstructorQuestionAnalyticsService(instructorId, assessmentId);

    return res.status(200).json(
        new ApiResponse(data, "Instructor question analytics fetched successfully")
    );
}


