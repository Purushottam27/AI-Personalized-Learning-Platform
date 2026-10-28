import mongoose from "mongoose";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { PracticeAttempt } from "../../practice/models/practiceAttempt.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { getLearnerRecommendationsService } from "../../recommendation/services/recommendation.service.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { ANALYTICS_CONSTANTS, ANALYTICS_ERROR_CODES } from "../constants/analytics.constants.js";

function requireObjectId(value, fieldName = "ID") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${fieldName}`);
    }
}

/**
 * Computes consecutive active study days based on LearningEvidence completion dates.
 * Evaluates UTC calendar days ending today or yesterday.
 * @param {Array<Date>} completionDates
 * @returns {number}
 */
export function calculateStreak(completionDates) {
    if (!Array.isArray(completionDates) || completionDates.length === 0) {
        return 0;
    }

    const uniqueDates = new Set(
        completionDates
            .filter((d) => d instanceof Date && !isNaN(d.getTime()))
            .map((d) => d.toISOString().split("T")[0])
    );

    const sortedDates = Array.from(uniqueDates).sort().reverse();
    if (sortedDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    const mostRecentDate = sortedDates[0];
    if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
        return 0; // Streak broken if no activity today or yesterday
    }

    let streak = 0;
    let expectedDate = new Date(mostRecentDate);

    for (const dateStr of sortedDates) {
        const expectedDateStr = expectedDate.toISOString().split("T")[0];
        if (dateStr === expectedDateStr) {
            streak++;
            expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Aggregates study minutes from attempt durations or fallback question estimates.
 * @param {Array<Object>} evidenceList
 * @param {Map<string, Object>} attemptsMap
 * @returns {number}
 */
export function calculateStudyMinutes(evidenceList, attemptsMap) {
    let totalMinutes = 0;

    for (const ev of evidenceList) {
        const attempt = ev.attemptId ? attemptsMap.get(ev.attemptId.toString()) : null;
        if (attempt && attempt.startedAt && attempt.submittedAt) {
            const diffMs = new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime();
            const minutes = Math.round(diffMs / 60000);
            if (minutes > 0 && minutes <= ANALYTICS_CONSTANTS.MAX_SINGLE_ATTEMPT_STUDY_MINUTES) {
                totalMinutes += minutes;
                continue;
            }
        }
        // Defensible fallback: estimate based on questions attempted
        const estimated = Math.round((ev.totalQuestions || 5) * ANALYTICS_CONSTANTS.ESTIMATED_MINUTES_PER_QUESTION);
        totalMinutes += estimated;
    }

    return totalMinutes;
}

/**
 * Generates continuous zero-filled daily trends for a specified date range.
 * @param {Array<Object>} evidenceList
 * @param {number} days
 * @returns {Array<Object>}
 */
export function buildContinuousDailyTrends(evidenceList, days = 7) {
    const trendMap = new Map();
    const now = new Date();

    // Initialize all days in the window with zero values
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        trendMap.set(dateStr, {
            date: dateStr,
            practiceCount: 0,
            assessmentCount: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            scores: [],
        });
    }

    for (const ev of evidenceList) {
        if (!ev.completedAt) continue;
        const dateStr = new Date(ev.completedAt).toISOString().split("T")[0];
        const dayRecord = trendMap.get(dateStr);
        if (dayRecord) {
            if (ev.sourceType === "PRACTICE") {
                dayRecord.practiceCount++;
            } else if (ev.sourceType === "ASSESSMENT") {
                dayRecord.assessmentCount++;
            }
            dayRecord.totalQuestions += ev.totalQuestions || 0;
            if (typeof ev.correctCount === "number") {
                dayRecord.totalCorrect += ev.correctCount;
            }
            if (typeof ev.scorePercent === "number") {
                dayRecord.scores.push(ev.scorePercent);
            }
        }
    }

    return Array.from(trendMap.values()).map((day) => ({
        date: day.date,
        practiceCount: day.practiceCount,
        assessmentCount: day.assessmentCount,
        totalQuestions: day.totalQuestions,
        accuracyPercent: day.totalQuestions > 0 ? Math.round((day.totalCorrect / day.totalQuestions) * 100) : 0,
        averageScore: day.scores.length > 0 ? Math.round(day.scores.reduce((a, b) => a + b, 0) / day.scores.length) : 0,
    }));
}

/**
 * Learner Dashboard Aggregation Service.
 * Serves GET /api/v1/learning/me/dashboard
 */
export async function getLearnerDashboardService(learnerId) {
    requireObjectId(learnerId, "learnerId");

    // 1. Enrolled active courses
    const activeEnrollments = await Enrollment.find({
        learnerId,
        status: "ACTIVE",
    }).sort({ enrolledAt: -1 }).lean();

    const activeCourseIds = activeEnrollments.map((e) => e.courseId);

    // 2. Resolve Most Recent / Active Course Progress
    let continueLearning = null;
    let progress = null;

    if (activeCourseIds.length > 0) {
        // Find latest evidence to identify current active course, or fallback to latest enrollment
        const latestEvidence = await LearningEvidence.findOne({
            learnerId,
            courseId: { $in: activeCourseIds },
        }).sort({ completedAt: -1 }).lean();

        const activeCourseId = latestEvidence?.courseId || activeCourseIds[0];
        const currentCourse = await Course.findById(activeCourseId).lean();

        if (currentCourse && currentCourse.status === "PUBLISHED") {
            const topics = await Topic.find({ courseId: currentCourse._id })
                .sort({ order: 1 })
                .lean();

            const masteryRecords = await TopicMastery.find({
                learnerId,
                courseId: currentCourse._id,
            }).lean();

            const masteryMap = new Map(masteryRecords.map((m) => [m.topicId.toString(), m]));

            const masteredTopicsCount = topics.filter((t) => {
                const m = masteryMap.get(t._id.toString());
                return m && (m.status === MASTERY_STATUS.MASTERED || m.status === MASTERY_STATUS.STRONG);
            }).length;

            // Find earliest unmastered topic in curriculum order
            const currentTopic = topics.find((t) => {
                const m = masteryMap.get(t._id.toString());
                return !m || (m.status !== MASTERY_STATUS.MASTERED && m.status !== MASTERY_STATUS.STRONG);
            }) || topics[topics.length - 1] || null;

            const progressPercentage = topics.length > 0
                ? Math.round((masteredTopicsCount / topics.length) * 100)
                : 0;

            continueLearning = {
                courseId: currentCourse._id.toString(),
                courseTitle: currentCourse.title,
                progressPercentage,
                completedTopics: masteredTopicsCount,
                totalTopics: topics.length,
                currentTopicTitle: currentTopic?.title || "Course Completed",
                currentTopicId: currentTopic?._id?.toString() || "",
            };

            progress = continueLearning;
        }
    }

    // 3. Recommendation Engine Integration (Next Best Action & Course Recommendations)
    let nextBestAction = null;
    let recommendations = [];

    try {
        const recomResult = await getLearnerRecommendationsService(learnerId, { limit: 6 });
        if (recomResult?.nextBestAction) {
            const nba = recomResult.nextBestAction;
            let mappedType = "START_PRACTICE";
            if (nba.actionType === "INTRODUCTORY_LESSON" || nba.actionType === "REVIEW_LESSON") {
                mappedType = "CONTINUE_LESSON";
            } else if (nba.actionType === "WEAKNESS_REVISION" || nba.actionType === "PROGRESS_TO_TOPIC") {
                mappedType = "REVIEW_TOPIC";
            } else if (nba.actionType === "TAKE_ASSESSMENT") {
                mappedType = "TAKE_ASSESSMENT";
            }

            nextBestAction = {
                type: mappedType,
                title: nba.title,
                description: nba.description,
                targetId: nba.targetId ? nba.targetId.toString() : "",
            };
        }

        if (Array.isArray(recomResult?.recommendations)) {
            // Deduplicate courses recommended
            const seenCourseIds = new Set();
            for (const rec of recomResult.recommendations) {
                const cId = rec.courseId.toString();
                if (!seenCourseIds.has(cId)) {
                    seenCourseIds.add(cId);
                    recommendations.push({
                        courseId: cId,
                        title: rec.courseTitle,
                        description: rec.description,
                        reason: rec.explanation,
                        level: rec.tier,
                    });
                }
            }
        }
    } catch {
        // Fallback gracefully without breaking dashboard if recommendation returns empty
    }

    // 4. Strengths & Needs Attention
    const strongMastery = await TopicMastery.find({
        learnerId,
        status: { $in: [MASTERY_STATUS.STRONG, MASTERY_STATUS.MASTERED] },
    })
        .sort({ masteryScore: -1 })
        .limit(ANALYTICS_CONSTANTS.MAX_STRENGTHS_LIMIT)
        .lean();

    const weakMastery = await TopicMastery.find({
        learnerId,
        status: { $in: [MASTERY_STATUS.NEEDS_IMPROVEMENT, MASTERY_STATUS.DEVELOPING] },
    })
        .sort({ masteryScore: 1 })
        .limit(ANALYTICS_CONSTANTS.MAX_WEAKNESSES_LIMIT)
        .lean();

    const topicIdsToResolve = [
        ...strongMastery.map((m) => m.topicId),
        ...weakMastery.map((m) => m.topicId),
    ];

    const resolvedTopics = await Topic.find({ _id: { $in: topicIdsToResolve } })
        .select("_id title")
        .lean();

    const topicTitleMap = new Map(resolvedTopics.map((t) => [t._id.toString(), t.title]));

    const strengths = strongMastery.map((m) => ({
        topicId: m.topicId.toString(),
        title: topicTitleMap.get(m.topicId.toString()) || "Topic",
    }));

    const needsAttention = weakMastery.map((m) => ({
        topicId: m.topicId.toString(),
        title: topicTitleMap.get(m.topicId.toString()) || "Topic",
    }));

    // 5. Study Summary (Weekly Time, Topics Done, Streak)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyEvidence = await LearningEvidence.find({
        learnerId,
        completedAt: { $gte: sevenDaysAgo },
    }).lean();

    // Retrieve attempt durations for weekly study minutes
    const practiceAttemptIds = weeklyEvidence
        .filter((e) => e.sourceType === "PRACTICE" && e.attemptId)
        .map((e) => e.attemptId);

    const assessmentAttemptIds = weeklyEvidence
        .filter((e) => e.sourceType === "ASSESSMENT" && e.attemptId)
        .map((e) => e.attemptId);

    const [practiceAttempts, assessmentAttempts] = await Promise.all([
        practiceAttemptIds.length > 0
            ? PracticeAttempt.find({ _id: { $in: practiceAttemptIds } }).select("startedAt submittedAt totalQuestions").lean()
            : [],
        assessmentAttemptIds.length > 0
            ? AssessmentAttempt.find({ _id: { $in: assessmentAttemptIds } }).select("startedAt submittedAt totalQuestions").lean()
            : [],
    ]);

    const attemptsMap = new Map();
    for (const pa of practiceAttempts) attemptsMap.set(pa._id.toString(), pa);
    for (const aa of assessmentAttempts) attemptsMap.set(aa._id.toString(), aa);

    const weeklyStudyMinutes = calculateStudyMinutes(weeklyEvidence, attemptsMap);

    // Topics mastered this week
    const topicsCompletedThisWeek = await TopicMastery.countDocuments({
        learnerId,
        status: { $in: [MASTERY_STATUS.STRONG, MASTERY_STATUS.MASTERED] },
        updatedAt: { $gte: sevenDaysAgo },
    });

    // Streak calculation across all evidence
    const allEvidenceDates = await LearningEvidence.find({ learnerId })
        .select("completedAt")
        .lean();

    const currentStreakDays = calculateStreak(allEvidenceDates.map((e) => e.completedAt));

    const summary = {
        weeklyStudyMinutes,
        topicsCompletedThisWeek,
        currentStreakDays,
    };

    // 6. Chronological Recent Activity Feed (Learning Evidence + Enrollments)
    const recentEvidence = await LearningEvidence.find({ learnerId })
        .sort({ completedAt: -1 })
        .limit(ANALYTICS_CONSTANTS.RECENT_ACTIVITY_LIMIT)
        .lean();

    const recentEnrollments = await Enrollment.find({ learnerId })
        .sort({ enrolledAt: -1 })
        .limit(5)
        .lean();

    const activityCourseIds = [
        ...recentEvidence.map((e) => e.courseId),
        ...recentEnrollments.map((e) => e.courseId),
    ];
    const activityTopicIds = recentEvidence.map((e) => e.topicId).filter(Boolean);

    const [coursesList, topicsList] = await Promise.all([
        Course.find({ _id: { $in: activityCourseIds } }).select("_id title").lean(),
        Topic.find({ _id: { $in: activityTopicIds } }).select("_id title").lean(),
    ]);

    const courseMap = new Map(coursesList.map((c) => [c._id.toString(), c.title]));
    const topicMap = new Map(topicsList.map((t) => [t._id.toString(), t.title]));

    const combinedActivities = [];

    for (const ev of recentEvidence) {
        const cTitle = courseMap.get(ev.courseId.toString()) || "Course";
        const tTitle = ev.topicId ? topicMap.get(ev.topicId.toString()) : null;

        let type = "PRACTICE_COMPLETED";
        let title = tTitle ? `Practice: ${tTitle}` : `Practice: ${cTitle}`;

        if (ev.sourceType === "ASSESSMENT") {
            type = ev.passed ? "ASSESSMENT_PASSED" : "PRACTICE_COMPLETED";
            title = tTitle
                ? `${ev.assessmentSubtype || "Topic"} Assessment: ${tTitle}`
                : `${ev.assessmentSubtype || "Course"} Assessment: ${cTitle}`;
        }

        combinedActivities.push({
            id: ev.attemptId ? ev.attemptId.toString() : ev._id.toString(),
            type,
            title,
            timestamp: new Date(ev.completedAt).getTime(),
            date: new Date(ev.completedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
        });
    }

    for (const enr of recentEnrollments) {
        const cTitle = courseMap.get(enr.courseId.toString()) || "Course";
        combinedActivities.push({
            id: enr._id.toString(),
            type: "COURSE_ENROLLED",
            title: `Enrolled in ${cTitle}`,
            timestamp: new Date(enr.enrolledAt).getTime(),
            date: new Date(enr.enrolledAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
        });
    }

    combinedActivities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivity = combinedActivities.slice(0, ANALYTICS_CONSTANTS.RECENT_ACTIVITY_LIMIT);

    return {
        continueLearning,
        nextBestAction,
        progress,
        strengths,
        needsAttention,
        summary,
        recommendations,
        recentActivity,
    };
}

/**
 * Course-Scoped Progress Breakdown Service.
 * Serves GET /api/v1/learning/me/courses/:courseId/progress
 */
export async function getLearnerCourseProgressService(learnerId, courseId) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(courseId, "courseId");

    const course = await Course.findById(courseId).lean();
    if (!course || course.status !== "PUBLISHED") {
        throw new ApiError(404, ANALYTICS_ERROR_CODES.COURSE_NOT_AVAILABLE, "Course is not published or does not exist");
    }

    const enrollment = await Enrollment.findOne({
        learnerId,
        courseId,
        status: "ACTIVE",
    }).lean();

    if (!enrollment) {
        throw new ApiError(
            403,
            ANALYTICS_ERROR_CODES.ACTIVE_ENROLLMENT_REQUIRED,
            "Active enrollment is required to view course progress"
        );
    }

    const topics = await Topic.find({ courseId: course._id })
        .sort({ order: 1 })
        .lean();

    const masteryRecords = await TopicMastery.find({
        learnerId,
        courseId: course._id,
    }).lean();

    const masteryMap = new Map(masteryRecords.map((m) => [m.topicId.toString(), m]));

    let masteredTopics = 0;
    let evaluatedTopics = 0;

    const topicProgressList = topics.map((topic) => {
        const m = masteryMap.get(topic._id.toString());
        const hasEvidence = Boolean(m && m.evidenceCount > 0);
        const isMastered = Boolean(m && (m.status === MASTERY_STATUS.MASTERED || m.status === MASTERY_STATUS.STRONG));

        if (hasEvidence) evaluatedTopics++;
        if (isMastered) masteredTopics++;

        return {
            topicId: topic._id.toString(),
            title: topic.title,
            order: topic.order,
            masteryScore: m ? m.masteryScore : 0,
            status: m ? m.status : MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: m ? m.confidence : 0,
            evidenceCount: m ? m.evidenceCount : 0,
            practiceAttemptsCount: m ? m.practiceAttemptsCount : 0,
            assessmentAttemptsCount: m ? m.assessmentAttemptsCount : 0,
            lastEvaluatedAt: m ? m.lastEvaluatedAt : null,
        };
    });

    const progressPercentage = topics.length > 0
        ? Math.round((masteredTopics / topics.length) * 100)
        : 0;

    return {
        courseId: course._id.toString(),
        courseTitle: course.title,
        domain: course.domain,
        category: course.category,
        enrolledAt: enrollment.enrolledAt,
        totalTopics: topics.length,
        evaluatedTopics,
        masteredTopics,
        progressPercentage,
        topics: topicProgressList,
    };
}

/**
 * Deep Learner Analytics Overview Service.
 * Serves GET /api/v1/learning/me/analytics/overview
 */
export async function getLearnerAnalyticsOverviewService(learnerId, options = {}) {
    requireObjectId(learnerId, "learnerId");

    const days = options.days
        ? Math.min(Math.max(Number(options.days), ANALYTICS_CONSTANTS.MIN_TREND_DAYS), ANALYTICS_CONSTANTS.MAX_TREND_DAYS)
        : ANALYTICS_CONSTANTS.DEFAULT_TREND_DAYS;

    // 1. Activity Totals from LearningEvidence
    const [evidenceTotals, practiceCount, assessmentCount, activeCoursesCount] = await Promise.all([
        LearningEvidence.aggregate([
            { $match: { learnerId: new mongoose.Types.ObjectId(learnerId) } },
            {
                $group: {
                    _id: null,
                    totalQuestions: { $sum: "$totalQuestions" },
                    totalCorrect: { $sum: { $ifNull: ["$correctCount", 0] } },
                    totalMarksAwarded: { $sum: "$marksAwarded" },
                    totalMarksPossible: { $sum: "$totalMarks" },
                },
            },
        ]),
        LearningEvidence.countDocuments({ learnerId, sourceType: "PRACTICE" }),
        LearningEvidence.countDocuments({ learnerId, sourceType: "ASSESSMENT" }),
        Enrollment.countDocuments({ learnerId, status: "ACTIVE" }),
    ]);

    const aggregateStats = evidenceTotals[0] || {
        totalQuestions: 0,
        totalCorrect: 0,
        totalMarksAwarded: 0,
        totalMarksPossible: 0,
    };

    const overallAccuracy = aggregateStats.totalQuestions > 0
        ? Math.round((aggregateStats.totalCorrect / aggregateStats.totalQuestions) * 100)
        : 0;

    // 2. Mastery Distribution across all topics
    const allMastery = await TopicMastery.find({ learnerId }).lean();
    const distributionCounts = {
        [MASTERY_STATUS.MASTERED]: 0,
        [MASTERY_STATUS.STRONG]: 0,
        [MASTERY_STATUS.FUNCTIONAL]: 0,
        [MASTERY_STATUS.DEVELOPING]: 0,
        [MASTERY_STATUS.NEEDS_IMPROVEMENT]: 0,
        [MASTERY_STATUS.INSUFFICIENT_EVIDENCE]: 0,
    };

    for (const m of allMastery) {
        if (distributionCounts[m.status] !== undefined) {
            distributionCounts[m.status]++;
        }
    }

    // 3. Continuous Daily Trend
    const windowStartDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const windowEvidence = await LearningEvidence.find({
        learnerId,
        completedAt: { $gte: windowStartDate },
    }).lean();

    const dailyTrends = buildContinuousDailyTrends(windowEvidence, days);

    // 4. Multi-course Topic Mastery Summaries
    const activeEnrollments = await Enrollment.find({
        learnerId,
        status: "ACTIVE",
    }).lean();

    const activeCourseIds = activeEnrollments.map((e) => e.courseId);
    const enrolledCourses = await Course.find({
        _id: { $in: activeCourseIds },
        status: "PUBLISHED",
    }).select("_id title domain category").lean();

    const courseProgressList = [];
    for (const c of enrolledCourses) {
        const totalTopicsCount = await Topic.countDocuments({ courseId: c._id });
        const courseMasteries = allMastery.filter((m) => m.courseId.toString() === c._id.toString());
        const masteredCount = courseMasteries.filter(
            (m) => m.status === MASTERY_STATUS.MASTERED || m.status === MASTERY_STATUS.STRONG
        ).length;
        const evaluatedCount = courseMasteries.filter((m) => m.evidenceCount > 0).length;

        courseProgressList.push({
            courseId: c._id.toString(),
            courseTitle: c.title,
            domain: c.domain,
            totalTopics: totalTopicsCount,
            evaluatedTopics: evaluatedCount,
            masteredTopics: masteredCount,
            progressPercentage: totalTopicsCount > 0 ? Math.round((masteredCount / totalTopicsCount) * 100) : 0,
        });
    }

    return {
        activityTotals: {
            activeCoursesCount,
            totalPracticesCompleted: practiceCount,
            totalAssessmentsCompleted: assessmentCount,
            totalQuestionsAttempted: aggregateStats.totalQuestions,
            totalQuestionsCorrect: aggregateStats.totalCorrect,
            overallAccuracy,
        },
        masteryDistribution: distributionCounts,
        dailyTrends,
        courseProgressList,
    };
}
