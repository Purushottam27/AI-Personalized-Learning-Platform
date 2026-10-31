import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { User } from "../../identity/models/user.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function requireObjectId(value, fieldName = "ID") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${fieldName}`);
    }
}

const ENROLLMENT_STATUS_PRIORITY = {
    ACTIVE: 3,
    COMPLETED: 2,
    WITHDRAWN: 1,
};

function selectAuthoritativeEnrollment(enrollments) {
    return [...enrollments].sort((a, b) => {
        const priorityDifference =
            (ENROLLMENT_STATUS_PRIORITY[b.status] || 0) -
            (ENROLLMENT_STATUS_PRIORITY[a.status] || 0);

        if (priorityDifference !== 0) return priorityDifference;

        return new Date(b.enrolledAt || b.createdAt || 0).getTime() -
            new Date(a.enrolledAt || a.createdAt || 0).getTime();
    })[0] || null;
}

/**
 * Returns instructor-safe, course-scoped details for one learner.
 * No answer arrays, answer keys, explanations, or raw attempt snapshots are returned.
 */
export async function getInstructorCourseLearnerDetailsService(
    instructorId,
    courseId,
    learnerId
) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(courseId, "courseId");
    requireObjectId(learnerId, "learnerId");

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const learnerObjectId = new mongoose.Types.ObjectId(learnerId);
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const course = await Course.findById(courseObjectId)
        .select("_id title status createdBy")
        .lean();

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorObjectId.toString()) {
        throw new ApiError(
            403,
            "COURSE_ACCESS_DENIED",
            "You do not have permission to view learners in this course"
        );
    }

    const learner = await User.findById(learnerObjectId)
        .select("_id name email avatar")
        .lean();

    if (!learner) {
        throw new ApiError(404, "LEARNER_NOT_FOUND", "Learner not found");
    }

    // Match the lifecycle precedence used by the course analytics endpoint:
    // ACTIVE > COMPLETED > WITHDRAWN, then latest enrollment date.
    const enrollmentRecords = await Enrollment.find({
        courseId: courseObjectId,
        learnerId: learnerObjectId,
    }).lean();

    const enrollment = selectAuthoritativeEnrollment(enrollmentRecords);

    if (!enrollment) {
        throw new ApiError(
            404,
            "LEARNER_NOT_ENROLLED_IN_COURSE",
            "This learner has no enrollment in the selected course"
        );
    }

    const [
        topics,
        masteryRecords,
        recentEvidence,
        totalEvidenceCount,
        assessmentAttempts,
        totalAssessmentAttempts,
    ] = await Promise.all([
        Topic.find({ courseId: courseObjectId }).sort({ order: 1 }).lean(),
        TopicMastery.find({
            learnerId: learnerObjectId,
            courseId: courseObjectId,
        }).lean(),
        LearningEvidence.find({
            learnerId: learnerObjectId,
            courseId: courseObjectId,
            contributeToLearningEvidence: true,
        }).sort({ completedAt: -1 }).limit(20).lean(),
        LearningEvidence.countDocuments({
            learnerId: learnerObjectId,
            courseId: courseObjectId,
            contributeToLearningEvidence: true,
        }),
        AssessmentAttempt.find({
            learnerId: learnerObjectId,
            courseId: courseObjectId,
        }).sort({ startedAt: -1 }).limit(30).lean(),
        AssessmentAttempt.countDocuments({
            learnerId: learnerObjectId,
            courseId: courseObjectId,
        }),
    ]);

    const masteryByTopicId = new Map(
        masteryRecords.map((record) => [record.topicId.toString(), record])
    );
    const topicById = new Map(topics.map((topic) => [topic._id.toString(), topic]));

    const topicProgress = topics.map((topic) => {
        const mastery = masteryByTopicId.get(topic._id.toString());

        return {
            topicId: topic._id.toString(),
            title: topic.title,
            order: topic.order,
            status: mastery?.status || MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            masteryScore: mastery?.masteryScore ?? null,
            confidence: mastery?.confidence ?? 0,
            evidenceCount: mastery?.evidenceCount ?? 0,
            practiceAttemptsCount: mastery?.practiceAttemptsCount ?? 0,
            assessmentAttemptsCount: mastery?.assessmentAttemptsCount ?? 0,
            firstEvidenceAt: mastery?.firstEvidenceAt ?? null,
            lastEvidenceAt: mastery?.lastEvidenceAt ?? null,
            lastEvaluatedAt: mastery?.lastEvaluatedAt ?? null,
        };
    });

    const masteredStatuses = new Set([
        MASTERY_STATUS.STRONG,
        MASTERY_STATUS.MASTERED,
        MASTERY_STATUS.FUNCTIONAL,
    ]);

    const masteredTopicsCount = topicProgress.filter((topic) =>
        masteredStatuses.has(topic.status)
    ).length;

    const evaluatedTopicScores = topicProgress
        .filter((topic) => typeof topic.masteryScore === "number")
        .map((topic) => topic.masteryScore);

    const averageMasteryScore = evaluatedTopicScores.length > 0
        ? Math.round(
            evaluatedTopicScores.reduce((sum, score) => sum + score, 0) /
            evaluatedTopicScores.length
        )
        : null;

    const assessmentIds = [
        ...new Set(assessmentAttempts.map((attempt) => attempt.assessmentId.toString())),
    ];

    const assessments = assessmentIds.length > 0
        ? await Assessment.find({
            _id: { $in: assessmentIds },
            courseId: courseObjectId,
        }).select("_id title type topicId").lean()
        : [];

    const assessmentById = new Map(
        assessments.map((assessment) => [assessment._id.toString(), assessment])
    );

    // Assessment attempt response is intentionally a summary. Do not serialize
    // attempt.answers, question snapshots, correctAnswer, or explanations.
    const attemptHistory = assessmentAttempts.map((attempt) => {
        const assessment = assessmentById.get(attempt.assessmentId.toString());
        const topic = assessment?.topicId
            ? topicById.get(assessment.topicId.toString())
            : null;

        const isEvaluated =
            attempt.status === "SUBMITTED" &&
            typeof attempt.scorePercent === "number" &&
            typeof attempt.passed === "boolean";

        return {
            attemptId: attempt._id.toString(),
            assessmentId: attempt.assessmentId.toString(),
            assessmentTitle: assessment?.title || "Assessment",
            assessmentType: attempt.assessmentType,
            topicId: assessment?.topicId?.toString() || null,
            topicTitle: topic?.title || null,
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            submissionReason: attempt.submissionReason,
            totalMarks: attempt.totalMarks,
            marksAwarded: isEvaluated ? attempt.marksAwarded : null,
            scorePercent: isEvaluated ? attempt.scorePercent : null,
            passed: isEvaluated ? attempt.passed : null,
        };
    });

    const activityAssessmentIds = [
        ...new Set(
            recentEvidence
                .filter((item) => item.sourceType === "ASSESSMENT")
                .map((item) => item.sourceId.toString())
        ),
    ];

    const activityAssessments = activityAssessmentIds.length > 0
        ? await Assessment.find({
            _id: { $in: activityAssessmentIds },
            courseId: courseObjectId,
        }).select("_id title").lean()
        : [];

    const activityAssessmentById = new Map(
        activityAssessments.map((assessment) => [
            assessment._id.toString(),
            assessment.title,
        ])
    );

    const recentActivity = recentEvidence.map((evidence) => {
        const topic = evidence.topicId
            ? topicById.get(evidence.topicId.toString())
            : null;

        const assessmentTitle = evidence.sourceType === "ASSESSMENT"
            ? activityAssessmentById.get(evidence.sourceId.toString()) || "Assessment"
            : null;

        return {
            evidenceId: evidence._id.toString(),
            sourceType: evidence.sourceType,
            title: evidence.sourceType === "ASSESSMENT"
                ? assessmentTitle
                : "Practice completed",
            topicId: evidence.topicId?.toString() || null,
            topicTitle: topic?.title || null,
            assessmentSubtype: evidence.assessmentSubtype,
            completedAt: evidence.completedAt,
            totalQuestions: evidence.totalQuestions,
            correctCount: evidence.correctCount,
            totalMarks: evidence.totalMarks,
            marksAwarded: evidence.marksAwarded,
            scorePercent: evidence.scorePercent,
            passed: evidence.passed,
        };
    });

    const evaluatedAssessmentAttemptsCount = attemptHistory.filter(
        (attempt) => attempt.scorePercent !== null
    ).length;

    return {
        course: {
            courseId: course._id.toString(),
            title: course.title,
            status: course.status,
        },
        learner: {
            learnerId: learner._id.toString(),
            name: learner.name,
            email: learner.email,
            avatar: learner.avatar || null,
        },
        enrollment: {
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt || null,
            withdrawnAt: enrollment.withdrawnAt || null,
        },
        overview: {
            totalTopics: topics.length,
            masteredTopicsCount,
            averageMasteryScore,
            totalEvidenceCount,
            totalAssessmentAttempts,
            evaluatedAssessmentAttemptsCount,
            lastActivityAt: recentEvidence[0]?.completedAt || null,
        },
        topics: topicProgress,
        assessmentAttempts: attemptHistory,
        recentActivity,
        activityPagination: {
            returnedItems: recentActivity.length,
            totalItems: totalEvidenceCount,
            hasMore: totalEvidenceCount > recentActivity.length,
        },
        assessmentAttemptPagination: {
            returnedItems: attemptHistory.length,
            totalItems: totalAssessmentAttempts,
            hasMore: totalAssessmentAttempts > attemptHistory.length,
        },
    };
}
