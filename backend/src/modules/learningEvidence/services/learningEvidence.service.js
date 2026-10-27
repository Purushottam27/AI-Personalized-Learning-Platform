import mongoose from "mongoose";
import { LearningEvidence } from "../models/learningEvidence.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { Course } from "../../course/models/course.model.js";
import { PracticeAttempt } from "../../practice/models/practiceAttempt.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { recalculateTopicMasteryService } from "../../topicMastery/services/topicMastery.service.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

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

function answersEqual(type, actual, expected) {
    if (actual == null) return false;
    if (type === "MCQ_MULTIPLE") {
        if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
        const left = [...actual].sort();
        const right = [...expected].sort();
        return left.length === right.length && left.every((value, index) => value === right[index]);
    }
    return actual === expected;
}

export function serializeLearningEvidence(evidence) {
    if (!evidence) return null;
    return {
        _id: evidence._id,
        learnerId: evidence.learnerId,
        courseId: evidence.courseId,
        topicId: evidence.topicId ?? null,
        sourceType: evidence.sourceType,
        sourceId: evidence.sourceId,
        attemptId: evidence.attemptId,
        assessmentSubtype: evidence.assessmentSubtype ?? null,
        completedAt: evidence.completedAt,
        totalQuestions: evidence.totalQuestions,
        correctCount: evidence.correctCount ?? null,
        totalMarks: evidence.totalMarks,
        marksAwarded: evidence.marksAwarded,
        scorePercent: evidence.scorePercent,
        passed: evidence.passed ?? null,
        contributeToLearningEvidence: evidence.contributeToLearningEvidence,
        createdAt: evidence.createdAt,
    };
}

/**
 * Record learning evidence from a submitted PracticeAttempt.
 * Must respect snapshotted contributeToLearningEvidence setting.
 */
export async function recordPracticeEvidenceService(attempt, session = null) {
    if (!attempt || attempt.status !== "SUBMITTED") {
        return null;
    }
    if (attempt.contributeToLearningEvidence !== true) {
        return null;
    }

    // Check if evidence already exists for this attempt
    const findQuery = LearningEvidence.findOne({ attemptId: attempt._id });
    const existing = await (session ? findQuery.session(session) : findQuery);
    if (existing) {
        return existing;
    }

    const totalQuestions = attempt.totalQuestions || (attempt.questions ? attempt.questions.length : 1);
    const correctCount = attempt.correctCount ?? 0;
    const marksAwarded = attempt.marksAwarded ?? 0;
    const totalMarks = attempt.totalMarks ?? 0;
    const scorePercent = attempt.scorePercent ?? 0;

    const payload = {
        learnerId: attempt.learnerId,
        courseId: attempt.courseId,
        topicId: attempt.topicId ?? null,
        sourceType: "PRACTICE",
        sourceId: attempt.practiceId,
        attemptId: attempt._id,
        assessmentSubtype: null,
        completedAt: attempt.submittedAt || new Date(),
        totalQuestions,
        correctCount,
        totalMarks,
        marksAwarded,
        scorePercent,
        passed: null,
        contributeToLearningEvidence: true,
    };

    let result;
    try {
        const [created] = await LearningEvidence.create([payload], session ? { session } : {});
        result = created;
    } catch (error) {
        if (isDuplicateKey(error)) {
            const query = LearningEvidence.findOne({ attemptId: attempt._id });
            result = await (session ? query.session(session) : query);
        } else {
            throw error;
        }
    }

    if (result?.topicId) {
        try {
            await recalculateTopicMasteryService(result.learnerId, result.courseId, result.topicId, session);
        } catch (err) {
            // Topic mastery calculation failure must not invalidate historical evidence recording
            console.error("Auto topic mastery recalculation failed:", err);
        }
    }

    return result;
}

/**
 * Record learning evidence from a submitted AssessmentAttempt.
 * Preserves DIAGNOSTIC, TOPIC, and FINAL assessment subtypes.
 */
export async function recordAssessmentEvidenceService(attempt, session = null) {
    if (!attempt || attempt.status !== "SUBMITTED") {
        return null;
    }

    const validSubtypes = ["DIAGNOSTIC", "TOPIC", "FINAL"];
    if (!validSubtypes.includes(attempt.assessmentType)) {
        return null;
    }

    // Check if evidence already exists for this attempt
    const findQuery = LearningEvidence.findOne({ attemptId: attempt._id });
    const existing = await (session ? findQuery.session(session) : findQuery);
    if (existing) {
        return existing;
    }

    let topicId = null;
    if (attempt.assessmentType === "TOPIC") {
        const assessmentQuery = Assessment.findById(attempt.assessmentId).select("topicId");
        const assessment = await (session ? assessmentQuery.session(session) : assessmentQuery);
        topicId = assessment?.topicId ?? null;
    }

    // Authoritative calculation of correct question count
    let correctCount = 0;
    const answerMap = new Map((attempt.answers || []).map((item) => [item.questionId.toString(), item.answer]));
    for (const question of (attempt.questions || [])) {
        const submitted = answerMap.get(question.questionId.toString()) ?? null;
        if (answersEqual(question.type, submitted, question.correctAnswer)) {
            correctCount += 1;
        }
    }

    const totalQuestions = (attempt.questions && attempt.questions.length) ? attempt.questions.length : 1;
    const marksAwarded = attempt.marksAwarded ?? 0;
    const totalMarks = attempt.totalMarks ?? 0;
    const scorePercent = attempt.scorePercent ?? 0;
    const passed = typeof attempt.passed === "boolean" ? attempt.passed : null;

    const payload = {
        learnerId: attempt.learnerId,
        courseId: attempt.courseId,
        topicId,
        sourceType: "ASSESSMENT",
        sourceId: attempt.assessmentId,
        attemptId: attempt._id,
        assessmentSubtype: attempt.assessmentType,
        completedAt: attempt.submittedAt || new Date(),
        totalQuestions,
        correctCount,
        totalMarks,
        marksAwarded,
        scorePercent,
        passed,
        contributeToLearningEvidence: true,
    };

    let result;
    try {
        const [created] = await LearningEvidence.create([payload], session ? { session } : {});
        result = created;
    } catch (error) {
        if (isDuplicateKey(error)) {
            const query = LearningEvidence.findOne({ attemptId: attempt._id });
            result = await (session ? query.session(session) : query);
        } else {
            throw error;
        }
    }

    if (result?.topicId) {
        try {
            await recalculateTopicMasteryService(result.learnerId, result.courseId, result.topicId, session);
        } catch (err) {
            // Topic mastery calculation failure must not invalidate historical evidence recording
            console.error("Auto topic mastery recalculation failed:", err);
        }
    }

    return result;
}

/**
 * Idempotent recovery / retry processor for learning evidence.
 */
export async function processLearningEvidenceForAttemptService({ sourceType, attemptId }, session = null) {
    requireObjectId(attemptId, "attemptId");

    if (sourceType === "PRACTICE") {
        const query = PracticeAttempt.findById(attemptId);
        const attempt = await (session ? query.session(session) : query);
        if (!attempt) {
            fail(404, "ATTEMPT_NOT_FOUND", "Practice attempt not found");
        }
        return await recordPracticeEvidenceService(attempt, session);
    }

    if (sourceType === "ASSESSMENT") {
        const query = AssessmentAttempt.findById(attemptId);
        const attempt = await (session ? query.session(session) : query);
        if (!attempt) {
            fail(404, "ATTEMPT_NOT_FOUND", "Assessment attempt not found");
        }
        return await recordAssessmentEvidenceService(attempt, session);
    }

    fail(400, "INVALID_SOURCE_TYPE", "sourceType must be PRACTICE or ASSESSMENT");
}

/**
 * Learner retrieves their own learning evidence history with optional filters & pagination.
 */
export async function getMyLearningEvidenceService(learnerId, query = {}) {
    requireObjectId(learnerId, "learnerId");

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { learnerId };

    if (query.courseId) {
        requireObjectId(query.courseId, "courseId");
        filter.courseId = query.courseId;
    }

    if (query.topicId) {
        requireObjectId(query.topicId, "topicId");
        filter.topicId = query.topicId;
    }

    if (query.sourceType) {
        if (!["PRACTICE", "ASSESSMENT"].includes(query.sourceType)) {
            fail(400, "INVALID_SOURCE_TYPE", "sourceType must be PRACTICE or ASSESSMENT");
        }
        filter.sourceType = query.sourceType;
    }

    const [items, totalEvidence] = await Promise.all([
        LearningEvidence.find(filter).sort({ completedAt: -1, _id: -1 }).skip(skip).limit(limit),
        LearningEvidence.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalEvidence / limit);

    return {
        evidence: items.map(serializeLearningEvidence),
        pagination: {
            page,
            limit,
            totalEvidence,
            totalPages,
        },
    };
}

/**
 * Instructor retrieves course learning evidence for courses they own.
 */
export async function getCourseLearningEvidenceService(instructorId, courseId, query = {}) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(courseId, "courseId");

    const course = await Course.findById(courseId);
    if (!course) {
        fail(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorId.toString()) {
        fail(403, "COURSE_ACCESS_DENIED", "You do not have permission to view evidence for this course");
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { courseId };

    if (query.learnerId) {
        requireObjectId(query.learnerId, "learnerId");
        filter.learnerId = query.learnerId;
    }

    if (query.topicId) {
        requireObjectId(query.topicId, "topicId");
        filter.topicId = query.topicId;
    }

    if (query.sourceType) {
        if (!["PRACTICE", "ASSESSMENT"].includes(query.sourceType)) {
            fail(400, "INVALID_SOURCE_TYPE", "sourceType must be PRACTICE or ASSESSMENT");
        }
        filter.sourceType = query.sourceType;
    }

    const [items, totalEvidence] = await Promise.all([
        LearningEvidence.find(filter).sort({ completedAt: -1, _id: -1 }).skip(skip).limit(limit),
        LearningEvidence.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalEvidence / limit);

    return {
        evidence: items.map(serializeLearningEvidence),
        pagination: {
            page,
            limit,
            totalEvidence,
            totalPages,
        },
    };
}

/**
 * Retrieve a single evidence record by ID with strict ownership authorization.
 */
export async function getLearningEvidenceByIdService(user, evidenceId) {
    requireObjectId(evidenceId, "evidenceId");

    const evidence = await LearningEvidence.findById(evidenceId);
    if (!evidence) {
        fail(404, "EVIDENCE_NOT_FOUND", "Learning evidence not found");
    }

    if (user.role === "LEARNER") {
        if (evidence.learnerId.toString() !== user._id.toString()) {
            fail(404, "EVIDENCE_NOT_FOUND", "Learning evidence not found");
        }
        return serializeLearningEvidence(evidence);
    }

    if (user.role === "INSTRUCTOR") {
        const course = await Course.findById(evidence.courseId);
        if (!course || course.createdBy.toString() !== user._id.toString()) {
            fail(403, "EVIDENCE_ACCESS_DENIED", "You do not have permission to view this evidence");
        }
        return serializeLearningEvidence(evidence);
    }

    fail(403, "UNAUTHORIZED_ACCESS", "Unauthorized to view learning evidence");
}
