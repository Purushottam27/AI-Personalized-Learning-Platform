import { PracticeAttempt } from "../../practice/models/practiceAttempt.model.js";
import { ResourceAccess } from "../../resource/models/resourceAccess.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

/**
 * Internal learning-first prerequisite for TOPIC assessments.
 * Do not expose which individual condition is missing to learners.
 */
export async function assertTopicLearningReady(learnerId, topicId, session = null) {
    let resourceQuery = ResourceAccess.exists({ learnerId, topicId });
    let practiceQuery = PracticeAttempt.exists({ learnerId, topicId, status: "SUBMITTED" });

    if (session) {
        resourceQuery = resourceQuery.session(session);
        practiceQuery = practiceQuery.session(session);
    }

    const [hasAccessedResource, hasSubmittedPractice] = await Promise.all([
        resourceQuery,
        practiceQuery,
    ]);

    if (!hasAccessedResource || !hasSubmittedPractice) {
        throw new ApiError(
            403,
            "ASSESSMENT_NOT_READY",
            "This assessment is not available yet. Take some time to explore the learning materials, strengthen your understanding, and prepare before attempting it."
        );
    }
}
