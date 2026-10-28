import { getLearnerRecommendationsService } from "../services/recommendation.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

/**
 * Learner retrieves general personalized recommendations across all actively enrolled courses.
 */
export async function getLearnerRecommendations(req, res) {
    const learnerId = req.user._id || req.user.id;
    const query = req.validatedQuery || req.query || {};

    const result = await getLearnerRecommendationsService(learnerId, {
        limit: query.limit,
    });

    res.status(200).json(
        new ApiResponse(result, "Recommendations fetched successfully")
    );
}

/**
 * Learner retrieves personalized recommendations for a specific enrolled course.
 */
export async function getLearnerCourseRecommendations(req, res) {
    const learnerId = req.user._id || req.user.id;
    const { courseId } = req.params;
    const query = req.validatedQuery || req.query || {};

    const result = await getLearnerRecommendationsService(learnerId, {
        courseId,
        limit: query.limit,
    });

    res.status(200).json(
        new ApiResponse(result, "Course recommendations fetched successfully")
    );
}
