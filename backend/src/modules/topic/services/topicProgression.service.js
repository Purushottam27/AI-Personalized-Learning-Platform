import { Topic } from "../models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function sameId(a, b) {
    return a != null && b != null && a.toString() === b.toString();
}

/**
 * Evaluates whether a Topic is currently unlocked for a specific learner.
 * Locking rules:
 * 1. If course.progressionPolicy.lockingEnabled is false, all topics are unlocked.
 * 2. If lockingEnabled is true:
 *    - Topic with order 1 is always unlocked.
 *    - Topic with order K (K > 1) is unlocked only if the learner has passed every
 *      publication-time required assessment for every topic with order < K.
 */
export async function isTopicUnlockedForLearner(learnerId, courseIdOrCourse, topicIdOrTopic) {
    if (!learnerId) {
        return { isUnlocked: false, reason: "LEARNER_REQUIRED" };
    }

    let course = courseIdOrCourse;
    if (!course || !course._id) {
        course = await Course.findById(courseIdOrCourse);
    }
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (!course.progressionPolicy?.lockingEnabled) {
        return { isUnlocked: true };
    }

    let targetTopic = topicIdOrTopic;
    if (!targetTopic || typeof targetTopic !== "object" || !("order" in targetTopic)) {
        targetTopic = await Topic.findById(topicIdOrTopic);
    }
    if (!targetTopic || !sameId(targetTopic.courseId, course._id)) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    // First topic in sequence is always unlocked
    if (targetTopic.order === 1) {
        return { isUnlocked: true };
    }

    // Fetch all topics in this course with order < targetTopic.order
    const priorTopics = await Topic.find({
        courseId: course._id,
        order: { $lt: targetTopic.order }
    }).sort({ order: 1 });

    const allRequiredAssessmentIds = [];
    for (const pt of priorTopics) {
        if (Array.isArray(pt.requiredAssessmentIds) && pt.requiredAssessmentIds.length > 0) {
            allRequiredAssessmentIds.push(...pt.requiredAssessmentIds);
        }
    }

    if (allRequiredAssessmentIds.length === 0) {
        return { isUnlocked: true };
    }

    const passedAttempts = await AssessmentAttempt.find({
        learnerId,
        assessmentId: { $in: allRequiredAssessmentIds },
        status: "SUBMITTED",
        passed: true
    }).select("assessmentId").lean();

    const passedAssessmentIdSet = new Set(passedAttempts.map((a) => a.assessmentId.toString()));

    for (const pt of priorTopics) {
        const reqs = pt.requiredAssessmentIds ?? [];
        for (const reqId of reqs) {
            if (!passedAssessmentIdSet.has(reqId.toString())) {
                return {
                    isUnlocked: false,
                    lockedByTopicId: pt._id,
                    missingAssessmentId: reqId,
                    reason: "PRIOR_TOPIC_INCOMPLETE"
                };
            }
        }
    }

    return { isUnlocked: true };
}

/**
 * Asserts that a Topic is unlocked for the learner.
 * Throws 403 TOPIC_LOCKED if locked.
 */
export async function assertTopicUnlockedForLearner(learnerId, courseIdOrCourse, topicIdOrTopic) {
    const status = await isTopicUnlockedForLearner(learnerId, courseIdOrCourse, topicIdOrTopic);
    if (!status.isUnlocked) {
        throw new ApiError(
            403,
            "TOPIC_LOCKED",
            "This topic is locked. Complete all required assessments in previous topics to unlock it",
            { lockedByTopicId: status.lockedByTopicId }
        );
    }
}

/**
 * Asserts that all topics in the course have been completed by the learner.
 * Required before starting a Course FINAL assessment.
 */
export async function assertAllTopicsCompletedForCourse(learnerId, courseIdOrCourse) {
    if (!learnerId) {
        throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "Learner required");
    }

    let course = courseIdOrCourse;
    if (!course || !course._id) {
        course = await Course.findById(courseIdOrCourse);
    }
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    const topics = await Topic.find({ courseId: course._id }).sort({ order: 1 });

    const allRequiredAssessmentIds = [];
    for (const t of topics) {
        if (Array.isArray(t.requiredAssessmentIds) && t.requiredAssessmentIds.length > 0) {
            allRequiredAssessmentIds.push(...t.requiredAssessmentIds);
        }
    }

    if (allRequiredAssessmentIds.length === 0) {
        return true;
    }

    const passedAttempts = await AssessmentAttempt.find({
        learnerId,
        assessmentId: { $in: allRequiredAssessmentIds },
        status: "SUBMITTED",
        passed: true
    }).select("assessmentId").lean();

    const passedAssessmentIdSet = new Set(passedAttempts.map((a) => a.assessmentId.toString()));

    for (const t of topics) {
        const reqs = t.requiredAssessmentIds ?? [];
        for (const reqId of reqs) {
            if (!passedAssessmentIdSet.has(reqId.toString())) {
                throw new ApiError(
                    403,
                    "TOPICS_NOT_COMPLETED",
                    "All required topic assessments must be completed before taking the final assessment",
                    { incompleteTopicId: t._id, missingAssessmentId: reqId }
                );
            }
        }
    }

    return true;
}
