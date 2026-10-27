import mongoose from "mongoose";
import { TopicMastery } from "../models/topicMastery.model.js";
import { computeTopicMastery } from "./masteryCalculation.service.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { MASTERY_STATUS, CURRENT_CALCULATION_VERSION } from "../constants/mastery.constants.js";

function fail(status, code, message, details = null) {
    throw new ApiError(status, code, message, details);
}

function requireObjectId(value, field) {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        fail(400, "INVALID_ID", `${field} is invalid`);
    }
}

function isDuplicateKey(error) {
    if (error?.code === 11000 || error?.code === 11001) return true;
    if (error?.errorResponse?.code === 11000 || error?.errorResponse?.code === 11001) return true;
    if (error?.writeErrors?.some((e) => e.code === 11000 || e.code === 11001)) return true;
    if (typeof error?.message === "string" && /E11000|E11001/.test(error.message)) return true;
    return false;
}

export function serializeTopicMastery(mastery) {
    if (!mastery) return null;
    return {
        _id: mastery._id ?? null,
        learnerId: mastery.learnerId,
        courseId: mastery.courseId,
        topicId: mastery.topicId,
        masteryScore: mastery.masteryScore,
        status: mastery.status,
        confidence: mastery.confidence,
        evidenceCount: mastery.evidenceCount,
        totalQuestionsAttempted: mastery.totalQuestionsAttempted ?? 0,
        totalQuestionsCorrect: mastery.totalQuestionsCorrect ?? 0,
        totalMarksAwarded: mastery.totalMarksAwarded ?? 0,
        totalMarksPossible: mastery.totalMarksPossible ?? 0,
        practiceAttemptsCount: mastery.practiceAttemptsCount ?? 0,
        assessmentAttemptsCount: mastery.assessmentAttemptsCount ?? 0,
        firstEvidenceAt: mastery.firstEvidenceAt ?? null,
        lastEvidenceAt: mastery.lastEvidenceAt ?? null,
        lastEvaluatedAt: mastery.lastEvaluatedAt,
        calculationVersion: mastery.calculationVersion ?? CURRENT_CALCULATION_VERSION,
        createdAt: mastery.createdAt ?? null,
        updatedAt: mastery.updatedAt ?? null,
    };
}

/**
 * Deterministically recalculates a learner's topic mastery from the authoritative Learning Evidence ledger.
 * Uses atomic upsert backed by the unique compound index.
 */
export async function recalculateTopicMasteryService(learnerId, courseId, topicId, session = null) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(courseId, "courseId");
    requireObjectId(topicId, "topicId");

    // Fetch all eligible evidence for this learner, course, and topic
    // Strictly requires contributeToLearningEvidence: true
    const evidenceQuery = LearningEvidence.find({
        learnerId,
        courseId,
        topicId,
        contributeToLearningEvidence: true,
    }).sort({ completedAt: 1, _id: 1 });

    const evidenceList = await (session ? evidenceQuery.session(session) : evidenceQuery);

    // Compute deterministic mastery
    const computed = computeTopicMastery(evidenceList);

    const updatePayload = {
        masteryScore: computed.masteryScore,
        status: computed.status,
        confidence: computed.confidence,
        evidenceCount: computed.evidenceCount,
        totalQuestionsAttempted: computed.totalQuestionsAttempted,
        totalQuestionsCorrect: computed.totalQuestionsCorrect,
        totalMarksAwarded: computed.totalMarksAwarded,
        totalMarksPossible: computed.totalMarksPossible,
        practiceAttemptsCount: computed.practiceAttemptsCount,
        assessmentAttemptsCount: computed.assessmentAttemptsCount,
        firstEvidenceAt: computed.firstEvidenceAt,
        lastEvidenceAt: computed.lastEvidenceAt,
        lastEvaluatedAt: new Date(),
        calculationVersion: computed.calculationVersion,
    };

    try {
        const query = TopicMastery.findOneAndUpdate(
            { learnerId, courseId, topicId },
            { $set: updatePayload },
            {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        return await (session ? query.session(session) : query);
    } catch (error) {
        if (isDuplicateKey(error)) {
            // Concurrent upsert race retry
            const retryQuery = TopicMastery.findOneAndUpdate(
                { learnerId, courseId, topicId },
                { $set: updatePayload },
                { returnDocument: "after", runValidators: true }
            );
            return await (session ? retryQuery.session(session) : retryQuery);
        }
        throw error;
    }
}

/**
 * Recalculates topic mastery for all topics within a course for a learner.
 */
export async function recalculateCourseMasteryService(learnerId, courseId, session = null) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(courseId, "courseId");

    const topicsQuery = Topic.find({ courseId }).sort({ order: 1 });
    const topics = await (session ? topicsQuery.session(session) : topicsQuery);

    const results = [];
    for (const topic of topics) {
        const mastery = await recalculateTopicMasteryService(learnerId, courseId, topic._id, session);
        results.push(serializeTopicMastery(mastery));
    }

    return results;
}

/**
 * Learner retrieves their own mastery for a specific topic.
 * Verifies topic existence and active enrollment in the course.
 */
export async function getLearnerTopicMasteryService(learnerId, topicId) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(topicId, "topicId");

    const topic = await Topic.findById(topicId);
    if (!topic) {
        fail(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);
    if (!course || course.status !== "PUBLISHED") {
        fail(404, "COURSE_NOT_AVAILABLE", "Course is not available");
    }

    const enrollment = await Enrollment.findOne({
        learnerId,
        courseId: topic.courseId,
        status: "ACTIVE",
    });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view topic mastery");
    }

    const mastery = await TopicMastery.findOne({
        learnerId,
        courseId: topic.courseId,
        topicId,
    });

    if (!mastery) {
        // Return default provisional unattempted record
        return {
            _id: null,
            learnerId,
            courseId: topic.courseId,
            topicId,
            masteryScore: 0,
            status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: 0,
            evidenceCount: 0,
            totalQuestionsAttempted: 0,
            totalQuestionsCorrect: 0,
            totalMarksAwarded: 0,
            totalMarksPossible: 0,
            practiceAttemptsCount: 0,
            assessmentAttemptsCount: 0,
            firstEvidenceAt: null,
            lastEvidenceAt: null,
            lastEvaluatedAt: null,
            calculationVersion: CURRENT_CALCULATION_VERSION,
        };
    }

    return serializeTopicMastery(mastery);
}

/**
 * Learner retrieves their mastery records for all topics in a course.
 */
export async function getLearnerCourseMasteryService(learnerId, courseId, query = {}) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(courseId, "courseId");

    const course = await Course.findById(courseId);
    if (!course || course.status !== "PUBLISHED") {
        fail(404, "COURSE_NOT_AVAILABLE", "Course is not available");
    }

    const enrollment = await Enrollment.findOne({
        learnerId,
        courseId,
        status: "ACTIVE",
    });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view course mastery");
    }

    const topics = await Topic.find({ courseId }).sort({ order: 1 });
    const masteryRecords = await TopicMastery.find({ learnerId, courseId });
    const masteryMap = new Map(masteryRecords.map((m) => [m.topicId.toString(), m]));

    let results = topics.map((t) => {
        const record = masteryMap.get(t._id.toString());
        if (record) {
            return {
                ...serializeTopicMastery(record),
                topicTitle: t.title,
                topicOrder: t.order,
            };
        }
        return {
            _id: null,
            learnerId,
            courseId,
            topicId: t._id,
            topicTitle: t.title,
            topicOrder: t.order,
            masteryScore: 0,
            status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: 0,
            evidenceCount: 0,
            totalQuestionsAttempted: 0,
            totalQuestionsCorrect: 0,
            totalMarksAwarded: 0,
            totalMarksPossible: 0,
            practiceAttemptsCount: 0,
            assessmentAttemptsCount: 0,
            firstEvidenceAt: null,
            lastEvidenceAt: null,
            lastEvaluatedAt: null,
            calculationVersion: CURRENT_CALCULATION_VERSION,
        };
    });

    if (query.status) {
        results = results.filter((r) => r.status === query.status);
    }

    return results;
}

/**
 * Learner retrieves all their identified weak topics (status = NEEDS_IMPROVEMENT).
 */
export async function getLearnerWeaknessesService(learnerId, query = {}) {
    requireObjectId(learnerId, "learnerId");

    const filter = {
        learnerId,
        status: MASTERY_STATUS.NEEDS_IMPROVEMENT,
    };

    if (query.courseId) {
        requireObjectId(query.courseId, "courseId");
        const enrollment = await Enrollment.findOne({
            learnerId,
            courseId: query.courseId,
            status: "ACTIVE",
        });
        if (!enrollment) {
            fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view weaknesses");
        }
        filter.courseId = query.courseId;
    } else {
        // Only return weaknesses for courses where learner has an active enrollment
        const activeEnrollments = await Enrollment.find({ learnerId, status: "ACTIVE" }).select("courseId");
        filter.courseId = { $in: activeEnrollments.map((e) => e.courseId) };
    }

    const weakRecords = await TopicMastery.find(filter).sort({ masteryScore: 1, lastEvaluatedAt: -1 });
    const topicIds = weakRecords.map((w) => w.topicId);
    const topics = await Topic.find({ _id: { $in: topicIds } }).select("title order courseId");
    const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));

    return weakRecords.map((w) => {
        const topic = topicMap.get(w.topicId.toString());
        return {
            ...serializeTopicMastery(w),
            topicTitle: topic?.title ?? "Unknown Topic",
            topicOrder: topic?.order ?? null,
        };
    });
}

/**
 * Instructor views topic mastery for a course they own.
 */
export async function getInstructorTopicMasteryService(instructorId, courseId, topicId, query = {}) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(courseId, "courseId");
    requireObjectId(topicId, "topicId");

    const course = await Course.findOne({ _id: courseId, createdBy: instructorId });
    if (!course) {
        fail(404, "COURSE_NOT_FOUND", "Course not found or access denied");
    }

    const topic = await Topic.findOne({ _id: topicId, courseId });
    if (!topic) {
        fail(404, "TOPIC_NOT_FOUND", "Topic not found in this course");
    }

    const filter = { courseId, topicId };
    if (query.learnerId) {
        requireObjectId(query.learnerId, "learnerId");
        filter.learnerId = query.learnerId;
    }
    if (query.status) {
        filter.status = query.status;
    }

    const records = await TopicMastery.find(filter).sort({ masteryScore: 1 });
    return records.map((r) => serializeTopicMastery(r));
}

/**
 * Idempotent recovery / background sync handler for topic mastery.
 */
export async function processTopicMasteryRecoveryService({ learnerId, courseId, topicId }) {
    return await recalculateTopicMasteryService(learnerId, courseId, topicId);
}
