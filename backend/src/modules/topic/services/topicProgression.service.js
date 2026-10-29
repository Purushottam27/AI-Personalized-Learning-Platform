import { Topic } from "../models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
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
    if (!course || !course.status || !course.domain) {
        course = await Course.findById(courseIdOrCourse);
    }
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (!course.progressionPolicy?.lockingEnabled) {
        return { isUnlocked: true };
    }

    let targetTopic = topicIdOrTopic;
    if (!targetTopic || typeof targetTopic.order !== "number") {
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

    for (const pt of priorTopics) {
        let reqIds = pt.requiredAssessmentIds;
        if (!Array.isArray(reqIds) || reqIds.length === 0) {
            const courseTopicReq = course.publicationRequirements?.topics?.find(
                (ct) => sameId(ct.topicId, pt._id)
            );
            if (Array.isArray(courseTopicReq?.requiredAssessmentIds) && courseTopicReq.requiredAssessmentIds.length > 0) {
                reqIds = courseTopicReq.requiredAssessmentIds;
            }
        }

        if (Array.isArray(reqIds) && reqIds.length > 0) {
            // Must have passed every snapshotted required assessment
            const passedAttempts = await AssessmentAttempt.find({
                learnerId,
                assessmentId: { $in: reqIds },
                status: "SUBMITTED",
                passed: true
            }).select("assessmentId").lean();

            const passedSet = new Set(passedAttempts.map((a) => a.assessmentId.toString()));
            for (const reqId of reqIds) {
                if (!passedSet.has(reqId.toString())) {
                    return {
                        isUnlocked: false,
                        lockedByTopicId: pt._id,
                        missingAssessmentId: reqId,
                        reason: "PRIOR_TOPIC_INCOMPLETE"
                    };
                }
            }
        } else {
            // Safe fallback for legacy courses published before snapshots:
            // Never silently treat a missing snapshot as proof of completion!
            const publishedAssessments = await Assessment.find({
                courseId: course._id,
                topicId: pt._id,
                status: "PUBLISHED"
            }).select("_id").lean();

            if (publishedAssessments.length === 0) {
                return {
                    isUnlocked: false,
                    lockedByTopicId: pt._id,
                    reason: "PRIOR_TOPIC_INCOMPLETE"
                };
            }

            const passedAttempt = await AssessmentAttempt.findOne({
                learnerId,
                assessmentId: { $in: publishedAssessments.map((a) => a._id) },
                status: "SUBMITTED",
                passed: true
            }).select("_id").lean();

            if (!passedAttempt) {
                return {
                    isUnlocked: false,
                    lockedByTopicId: pt._id,
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
    if (!course || !course.status || !course.domain) {
        course = await Course.findById(courseIdOrCourse);
    }
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    const topics = await Topic.find({ courseId: course._id }).sort({ order: 1 });

    for (const t of topics) {
        let reqIds = t.requiredAssessmentIds;
        if (!Array.isArray(reqIds) || reqIds.length === 0) {
            const courseTopicReq = course.publicationRequirements?.topics?.find(
                (ct) => sameId(ct.topicId, t._id)
            );
            if (Array.isArray(courseTopicReq?.requiredAssessmentIds) && courseTopicReq.requiredAssessmentIds.length > 0) {
                reqIds = courseTopicReq.requiredAssessmentIds;
            }
        }

        if (Array.isArray(reqIds) && reqIds.length > 0) {
            const passedAttempts = await AssessmentAttempt.find({
                learnerId,
                assessmentId: { $in: reqIds },
                status: "SUBMITTED",
                passed: true
            }).select("assessmentId").lean();

            const passedSet = new Set(passedAttempts.map((a) => a.assessmentId.toString()));
            for (const reqId of reqIds) {
                if (!passedSet.has(reqId.toString())) {
                    throw new ApiError(
                        403,
                        "TOPICS_NOT_COMPLETED",
                        "All required topic assessments must be completed before taking the final assessment",
                        { incompleteTopicId: t._id, missingAssessmentId: reqId }
                    );
                }
            }
        } else {
            // Snapshot missing for topic in a published course:
            // Must have passed at least one published topic assessment
            const publishedAssessments = await Assessment.find({
                courseId: course._id,
                topicId: t._id,
                status: "PUBLISHED"
            }).select("_id").lean();

            if (publishedAssessments.length === 0) {
                throw new ApiError(
                    403,
                    "TOPICS_NOT_COMPLETED",
                    "All required topic assessments must be completed before taking the final assessment",
                    { incompleteTopicId: t._id }
                );
            }

            const passedAttempt = await AssessmentAttempt.findOne({
                learnerId,
                assessmentId: { $in: publishedAssessments.map((a) => a._id) },
                status: "SUBMITTED",
                passed: true
            }).select("_id").lean();

            if (!passedAttempt) {
                throw new ApiError(
                    403,
                    "TOPICS_NOT_COMPLETED",
                    "All required topic assessments must be completed before taking the final assessment",
                    { incompleteTopicId: t._id }
                );
            }
        }
    }

    return true;
}
