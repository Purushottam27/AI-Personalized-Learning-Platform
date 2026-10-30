import { ApiResponse } from "../../../shared/responses/ApiResponse.js";
import { getInstructorCourseAnalyticsService } from "../services/instructorAnalytics.service.js";

/**
 * Controller for GET /api/v1/instructor/courses/:courseId/analytics
 * Retrieves aggregated course performance, topic mastery distributions, weak topics, and learner breakdowns.
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

