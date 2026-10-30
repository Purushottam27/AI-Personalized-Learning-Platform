import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { User } from "../../identity/models/user.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function requireObjectId(value, fieldName = "ID") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${fieldName}`);
    }
}

/**
 * Service to aggregate comprehensive course analytics for an authorized instructor.
 *
 * @param {string|ObjectId} instructorId
 * @param {string|ObjectId} courseId
 * @param {Object} queryOptions - { page, limit, status, search }
 * @returns {Promise<Object>}
 */
export async function getInstructorCourseAnalyticsService(instructorId, courseId, queryOptions = {}) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(courseId, "courseId");

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    // 1. Verify Course Existence & Instructor Ownership
    const course = await Course.findById(courseObjectId).lean();
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorObjectId.toString()) {
        throw new ApiError(403, "COURSE_ACCESS_DENIED", "You do not have permission to view analytics for this course");
    }

    // 2. Fetch Curriculum Topics (in sequence order)
    const topics = await Topic.find({ courseId: courseObjectId }).sort({ order: 1 }).lean();
    const topicIds = topics.map((t) => t._id);

    // 3. Fetch All Enrollments for this course
    // The model permits historical WITHDRAWN/COMPLETED enrollment records and later re-enrollment.
    // Determine the single authoritative/current enrollment per learner.
    // Lifecycle precedence: ACTIVE > COMPLETED > WITHDRAWN, tie-broken by latest enrolledAt / updatedAt.
    const allEnrollments = await Enrollment.find({ courseId: courseObjectId }).sort({ enrolledAt: -1, updatedAt: -1 }).lean();

    const learnerLatestEnrollmentMap = new Map();
    const statusPriority = { ACTIVE: 3, COMPLETED: 2, WITHDRAWN: 1 };

    for (const enr of allEnrollments) {
        const lid = enr.learnerId.toString();
        if (!learnerLatestEnrollmentMap.has(lid)) {
            learnerLatestEnrollmentMap.set(lid, enr);
        } else {
            const existing = learnerLatestEnrollmentMap.get(lid);
            const existingScore = statusPriority[existing.status] || 0;
            const currentScore = statusPriority[enr.status] || 0;

            if (currentScore > existingScore) {
                learnerLatestEnrollmentMap.set(lid, enr);
            } else if (currentScore === existingScore) {
                const existingTime = new Date(existing.enrolledAt || existing.createdAt || 0).getTime();
                const currentTime = new Date(enr.enrolledAt || enr.createdAt || 0).getTime();
                if (currentTime > existingTime) {
                    learnerLatestEnrollmentMap.set(lid, enr);
                }
            }
        }
    }

    // Authoritative unique learner enrollments
    const enrollments = Array.from(learnerLatestEnrollmentMap.values());
    const enrolledLearnerIds = enrollments.map((e) => e.learnerId);

    // Total unique enrolled learners count (each learner counted only once)
    const totalEnrolledLearners = enrollments.length;
    const activeEnrollmentsCount = enrollments.filter((e) => e.status === "ACTIVE").length;
    const completedEnrollmentsCount = enrollments.filter((e) => e.status === "COMPLETED").length;
    const withdrawnEnrollmentsCount = enrollments.filter((e) => e.status === "WITHDRAWN").length;

    // 4. Fetch All Learning Evidence records for this course
    const evidenceRecords = await LearningEvidence.find({
        courseId: courseObjectId,
        contributeToLearningEvidence: true,
    }).lean();

    const totalEligibleAttempts = evidenceRecords.length;

    // Derive active learners strictly from authoritative evidence records
    const learnerEvidenceDatesMap = new Map();
    const activeLearnersSet = new Set();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let activeLearnersLast7DaysCount = 0;
    let activeLearnersLast30DaysCount = 0;
    const learnersWith7DaysSet = new Set();
    const learnersWith30DaysSet = new Set();

    let totalMarksAwardedSum = 0;
    let totalMarksPossibleSum = 0;

    for (const ev of evidenceRecords) {
        const lid = ev.learnerId.toString();
        activeLearnersSet.add(lid);

        if (!learnerEvidenceDatesMap.has(lid)) {
            learnerEvidenceDatesMap.set(lid, []);
        }
        learnerEvidenceDatesMap.get(lid).push(ev.completedAt);

        if (ev.completedAt >= sevenDaysAgo) {
            learnersWith7DaysSet.add(lid);
        }
        if (ev.completedAt >= thirtyDaysAgo) {
            learnersWith30DaysSet.add(lid);
        }

        totalMarksAwardedSum += Number(ev.marksAwarded) || 0;
        totalMarksPossibleSum += Number(ev.totalMarks) || 0;
    }

    const activeLearnersCount = activeLearnersSet.size;
    activeLearnersLast7DaysCount = learnersWith7DaysSet.size;
    activeLearnersLast30DaysCount = learnersWith30DaysSet.size;

    const overallAverageAccuracy = totalMarksPossibleSum > 0
        ? Math.round((totalMarksAwardedSum / totalMarksPossibleSum) * 100)
        : null;

    // 5. Fetch All TopicMastery records for this course
    const masteryRecords = await TopicMastery.find({ courseId: courseObjectId }).lean();

    // Map: topicIdStr -> Array of TopicMastery
    const topicMasteryMap = new Map();
    // Map: learnerIdStr -> Array of TopicMastery
    const learnerMasteryMap = new Map();

    for (const m of masteryRecords) {
        const tid = m.topicId.toString();
        const lid = m.learnerId.toString();

        if (!topicMasteryMap.has(tid)) {
            topicMasteryMap.set(tid, []);
        }
        topicMasteryMap.get(tid).push(m);

        if (!learnerMasteryMap.has(lid)) {
            learnerMasteryMap.set(lid, []);
        }
        learnerMasteryMap.get(lid).push(m);
    }

    // 6. Aggregate Topic-Level Performance & Distributions
    const topicPerformanceList = [];
    const weakTopicsList = [];

    for (const topic of topics) {
        const tid = topic._id.toString();
        const topicMasteries = topicMasteryMap.get(tid) || [];

        // Count learners by status
        let strongCount = 0;
        let developingCount = 0;
        let needsImprovementCount = 0;
        let recordedInsufficientCount = 0;

        let scoreSum = 0;
        let scoreCount = 0;

        for (const tm of topicMasteries) {
            if (
                tm.status === MASTERY_STATUS.MASTERED ||
                tm.status === MASTERY_STATUS.STRONG ||
                tm.status === MASTERY_STATUS.FUNCTIONAL
            ) {
                strongCount++;
            } else if (tm.status === MASTERY_STATUS.DEVELOPING) {
                developingCount++;
            } else if (tm.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
                needsImprovementCount++;
            } else {
                recordedInsufficientCount++;
            }

            if (typeof tm.masteryScore === "number" && tm.masteryScore !== null) {
                scoreSum += tm.masteryScore;
                scoreCount++;
            }
        }

        // Learners who are enrolled in the course but have no TopicMastery record
        // are awaiting evidence (INSUFFICIENT_EVIDENCE)
        const unattemptedLearnersCount = Math.max(0, totalEnrolledLearners - topicMasteries.length);
        const totalInsufficientEvidenceCount = recordedInsufficientCount + unattemptedLearnersCount;

        const evaluatedLearnersCount = scoreCount;
        const averageMasteryScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;
        const needsImprovementPercentage = evaluatedLearnersCount > 0
            ? Math.round((needsImprovementCount / evaluatedLearnersCount) * 100)
            : 0;

        // Calculate distribution percentages relative to total enrolled learners (or 0 if no enrolled learners)
        const distribution = {
            STRONG: {
                count: strongCount,
                percentage: totalEnrolledLearners > 0 ? Math.round((strongCount / totalEnrolledLearners) * 100) : 0,
            },
            DEVELOPING: {
                count: developingCount,
                percentage: totalEnrolledLearners > 0 ? Math.round((developingCount / totalEnrolledLearners) * 100) : 0,
            },
            NEEDS_IMPROVEMENT: {
                count: needsImprovementCount,
                percentage: totalEnrolledLearners > 0 ? Math.round((needsImprovementCount / totalEnrolledLearners) * 100) : 0,
            },
            INSUFFICIENT_EVIDENCE: {
                count: totalInsufficientEvidenceCount,
                percentage: totalEnrolledLearners > 0 ? Math.round((totalInsufficientEvidenceCount / totalEnrolledLearners) * 100) : 0,
            },
        };

        const topicSummary = {
            topicId: topic._id.toString(),
            title: topic.title,
            order: topic.order,
            totalEnrolled: totalEnrolledLearners,
            evaluatedLearnersCount,
            averageMasteryScore,
            needsImprovementCount,
            needsImprovementPercentage,
            masteryDistribution: distribution,
        };

        topicPerformanceList.push(topicSummary);
    }

    // 7. Paginated Learner Performance Breakdown
    // Filter enrollments by status/search if requested
    const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryOptions.limit, 10) || 20));
    const filterStatus = queryOptions.status || "ALL";
    const searchTerm = (queryOptions.search || "").trim().toLowerCase();

    // Fetch user details for enrolled learners
    const users = await User.find({ _id: { $in: enrolledLearnerIds } })
        .select("_id name email avatar status")
        .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Build enriched learner records
    const allEnrichedLearners = enrollments.map((enr) => {
        const lid = enr.learnerId.toString();
        const user = userMap.get(lid) || {
            _id: enr.learnerId,
            name: "Unknown Learner",
            email: "",
            avatar: null,
            status: "ACTIVE",
        };

        const learnerMasteries = learnerMasteryMap.get(lid) || [];
        const learnerMasteryByTopicId = new Map(learnerMasteries.map((m) => [m.topicId.toString(), m]));

        // Calculate counts across topics for this learner
        let masteredTopicsCount = 0;
        let developingTopicsCount = 0;
        let needsImprovementTopicsCount = 0;
        let insufficientEvidenceTopicsCount = 0;
        let scoreSum = 0;
        let scoreCount = 0;
        let totalEvidenceCount = 0;

        const topicBreakdown = topics.map((t) => {
            const tm = learnerMasteryByTopicId.get(t._id.toString());
            if (!tm || tm.status === MASTERY_STATUS.INSUFFICIENT_EVIDENCE) {
                insufficientEvidenceTopicsCount++;
                return {
                    topicId: t._id.toString(),
                    title: t.title,
                    order: t.order,
                    status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
                    masteryScore: null,
                    confidence: tm ? tm.confidence : 0,
                    evidenceCount: tm ? tm.evidenceCount : 0,
                };
            }

            if (
                tm.status === MASTERY_STATUS.MASTERED ||
                tm.status === MASTERY_STATUS.STRONG ||
                tm.status === MASTERY_STATUS.FUNCTIONAL
            ) {
                masteredTopicsCount++;
            } else if (tm.status === MASTERY_STATUS.DEVELOPING) {
                developingTopicsCount++;
            } else if (tm.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
                needsImprovementTopicsCount++;
            }

            if (typeof tm.masteryScore === "number" && tm.masteryScore !== null) {
                scoreSum += tm.masteryScore;
                scoreCount++;
            }
            totalEvidenceCount += tm.evidenceCount || 0;

            return {
                topicId: t._id.toString(),
                title: t.title,
                order: t.order,
                status: tm.status,
                masteryScore: tm.masteryScore,
                confidence: tm.confidence,
                evidenceCount: tm.evidenceCount,
            };
        });

        // Needs attention flag: Learner has 1 or more demonstrated weaknesses (NEEDS_IMPROVEMENT)
        const needsAttention = needsImprovementTopicsCount > 0;
        const isAwaitingEvidence = scoreCount === 0;

        const learnerEvidenceDates = learnerEvidenceDatesMap.get(lid) || [];
        const lastActiveAt = learnerEvidenceDates.length > 0
            ? new Date(Math.max(...learnerEvidenceDates.map((d) => new Date(d).getTime())))
            : null;

        const averageMasteryScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;
        const progressPercentage = topics.length > 0 ? Math.round((masteredTopicsCount / topics.length) * 100) : 0;

        return {
            learnerId: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            enrollmentStatus: enr.status,
            enrolledAt: enr.enrolledAt,
            completedAt: enr.completedAt,
            lastActiveAt,
            totalEligibleAttempts: learnerEvidenceDates.length,
            totalEvidenceCount,
            averageMasteryScore,
            progressPercentage,
            masteredTopicsCount,
            developingTopicsCount,
            needsImprovementTopicsCount,
            insufficientEvidenceTopicsCount,
            hasNeedsImprovementEvidence: needsAttention,
            needsAttention,
            isAwaitingEvidence,
            topics: topicBreakdown,
        };
    });

    // Calculate course-wide overview learner metrics from the COMPLETE set of enrolled learners,
    // INDEPENDENTLY of table search, status filter, and pagination
    const courseWideLearnersNeedingAttentionCount = allEnrichedLearners.filter((l) => l.needsAttention).length;
    const courseWideLearnersAwaitingEvidenceCount = allEnrichedLearners.filter((l) => l.isAwaitingEvidence).length;

    // Apply filtering for learner table view only
    let filteredLearners = allEnrichedLearners;
    if (filterStatus !== "ALL") {
        filteredLearners = filteredLearners.filter((l) => l.enrollmentStatus === filterStatus);
    }

    if (searchTerm) {
        filteredLearners = filteredLearners.filter(
            (l) => l.name.toLowerCase().includes(searchTerm) || l.email.toLowerCase().includes(searchTerm)
        );
    }

    // Sort learners: those with needsAttention first, then by lowest averageMasteryScore, then by enrolledAt
    filteredLearners.sort((a, b) => {
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        if (a.averageMasteryScore !== null && b.averageMasteryScore !== null) {
            return a.averageMasteryScore - b.averageMasteryScore;
        }
        if (a.averageMasteryScore !== null && b.averageMasteryScore === null) return -1;
        if (a.averageMasteryScore === null && b.averageMasteryScore !== null) return 1;
        return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
    });

    const totalFilteredLearners = filteredLearners.length;
    const totalPages = Math.ceil(totalFilteredLearners / limit) || 1;
    const paginatedLearners = filteredLearners.slice((page - 1) * limit, page * limit);

    // 8. Overall Course-Level Summary
    return {
        course: {
            courseId: course._id.toString(),
            title: course.title,
            status: course.status,
            domain: course.domain,
            category: course.category,
            difficulty: course.difficulty,
            totalTopicsCount: topics.length,
        },
        overview: {
            totalEnrolledLearners,
            enrollmentBreakdown: {
                active: activeEnrollmentsCount,
                completed: completedEnrollmentsCount,
                withdrawn: withdrawnEnrollmentsCount,
            },
            activeLearners: {
                totalActiveAllTime: activeLearnersCount,
                activeLast7Days: activeLearnersLast7DaysCount,
                activeLast30Days: activeLearnersLast30DaysCount,
            },
            totalEligibleAttempts,
            overallAverageAccuracy,
            learnersWithNeedsImprovementCount: courseWideLearnersNeedingAttentionCount,
            learnersNeedingAttentionCount: courseWideLearnersNeedingAttentionCount, // Backwards compatible alias
            learnersAwaitingEvidenceCount: courseWideLearnersAwaitingEvidenceCount,
        },
        topicsPerformance: topicPerformanceList,
        learners: {
            items: paginatedLearners,
            pagination: {
                totalItems: totalFilteredLearners,
                totalPages,
                currentPage: page,
                limit,
            },
        },
    };
}

