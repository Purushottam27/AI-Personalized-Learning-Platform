import { StudyPlan } from "../models/studyPlan.model.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { computeTopicMastery } from "../../topicMastery/services/masteryCalculation.service.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { addCalendarDays, calendarDateKey, emptyPerformance, summarizePerformance } from "./studyPlanReview.utils.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

const VALID_ID = /^[0-9a-fA-F]{24}$/;

function fail(status, code, message) {
    throw new ApiError(status, code, message);
}


function isWithinDateRange(date, startDate, endDate, timeZone) {
    if (!date) return false;
    const key = calendarDateKey(new Date(date), timeZone);
    return key >= startDate && key <= endDate;
}



function activityEvidenceMatch(activity, evidence) {
    const targetId = String(activity.targetId || "");
    if (!targetId) return false;
    if (activity.activityType === "PRACTICE") {
        return evidence.some((item) => item.sourceType === "PRACTICE" &&
            (String(item.sourceId) === targetId || String(item.practiceId || "") === targetId));
    }
    if (activity.activityType === "ASSESSMENT") {
        return evidence.some((item) => item.sourceType === "ASSESSMENT" && String(item.sourceId) === targetId && item.passed === true);
    }
    return false;
}

function buildNextSteps(topicInsights, pendingActivities) {
    const steps = [];
    const weakTopics = topicInsights.filter((topic) => topic.status === MASTERY_STATUS.NEEDS_IMPROVEMENT);
    const developingTopics = topicInsights.filter((topic) => topic.status === MASTERY_STATUS.DEVELOPING);
    for (const topic of weakTopics.slice(0, 3)) {
        steps.push({
            type: "REVISIT_TOPIC",
            courseId: topic.courseId,
            topicId: topic.topicId,
            title: `Revisit ${topic.topicTitle}`,
            reason: `Recorded evidence places this topic in the needs-improvement range (${topic.masteryScore}%).`,
        });
    }
    for (const topic of developingTopics.slice(0, 2)) {
        steps.push({
            type: "PRACTICE_TOPIC",
            courseId: topic.courseId,
            topicId: topic.topicId,
            title: `Strengthen ${topic.topicTitle}`,
            reason: `Your recorded mastery is developing (${topic.masteryScore}%). More practice can help consolidate understanding.`,
        });
    }
    for (const activity of pendingActivities.slice(0, 3)) {
        steps.push({
            type: "RESUME_ACTIVITY",
            activityId: activity.activityId,
            title: `Resume ${activity.title}`,
            reason: activity.temporalStatus === "PAST"
                ? "This scheduled activity is still pending. Resume it when you are ready."
                : "This activity remains in your study plan.",
        });
    }
    if (!steps.length) {
        steps.push({
            type: "CONTINUE_LEARNING",
            title: "Continue your learning plan",
            reason: "There is not enough topic-level evidence to identify a specific weakness. Continue with your next eligible study activity.",
        });
    }
    return steps;
}

/**
 * Builds an evidence-grounded review for one owned StudyPlan.
 * The plan's stored seven-day calendar dates are authoritative; no Monday-Sunday assumption is made.
 */
export async function getStudyPlanWeeklyReviewService(learnerId, planId, now = new Date()) {
    if (!learnerId || !VALID_ID.test(String(learnerId))) fail(400, "INVALID_ID", "learnerId is invalid");
    if (!planId || !VALID_ID.test(String(planId))) fail(400, "INVALID_ID", "planId is invalid");

    const plan = await StudyPlan.findOne({ _id: planId, learnerId }).lean();
    if (!plan) fail(404, "STUDY_PLAN_NOT_FOUND", "Study plan not found");

    const timeZone = process.env.APP_TIMEZONE || "UTC";
    const startDate = plan.startDate;
    const endDate = plan.endDate;
    const previousStartDate = addCalendarDays(startDate, -7);
    const previousEndDate = addCalendarDays(startDate, -1);
    const courseIds = [...new Set((plan.scheduledActivities || []).map((activity) => String(activity.courseId)).filter(Boolean))];

    if (!courseIds.length) {
        return {
            plan: { planId: String(plan._id), version: plan.version, status: plan.status, startDate, endDate, timeZone },
            learningWeek: { scheduledActivities: 0, completedActivities: 0, pendingActivities: 0, overdueActivities: 0, activeLearningDays: 0 },
            performance: { practice: emptyPerformance(), assessments: emptyPerformance(), combined: emptyPerformance(), hasEvidence: false },
            topicUnderstanding: { topics: [], evidenceCount: 0, hasSufficientEvidence: false },
            attentionItems: [], nextSteps: [{ type: "CONTINUE_LEARNING", title: "Continue your learning plan", reason: "This plan has no scheduled course activities to review." }],
            comparison: { available: false, reason: "No scheduled course activities exist in this plan." },
        };
    }

    // Query a safe UTC envelope, then apply exact learner/application-local calendar dates.
    // The one-day padding covers all real-world IANA timezone offsets; the local date filter is authoritative.
    const envelopeEnd = new Date(`${addCalendarDays(endDate, 2)}T00:00:00.000Z`);
    const [allEvidence, topics] = await Promise.all([
        LearningEvidence.find({
            learnerId,
            courseId: { $in: courseIds },
            contributeToLearningEvidence: true,
            completedAt: { $lt: envelopeEnd },
        }).sort({ completedAt: 1, _id: 1 }).lean(),
        Topic.find({ courseId: { $in: courseIds } }).select("_id courseId title order").sort({ courseId: 1, order: 1 }).lean(),
    ]);

    const previousEvidence = allEvidence.filter((item) => isWithinDateRange(item.completedAt, previousStartDate, previousEndDate, timeZone));
    const weeklyEvidence = allEvidence.filter((item) => isWithinDateRange(item.completedAt, startDate, endDate, timeZone));
    const throughWeekEvidence = allEvidence.filter((item) => calendarDateKey(new Date(item.completedAt), timeZone) <= endDate);

    const practiceEvidence = weeklyEvidence.filter((item) => item.sourceType === "PRACTICE");
    const assessmentEvidence = weeklyEvidence.filter((item) => item.sourceType === "ASSESSMENT");

    const topicMap = new Map(topics.map((topic) => [String(topic._id), topic]));
    const evidenceByTopic = new Map();
    for (const item of throughWeekEvidence) {
        if (!item.topicId) continue;
        const key = String(item.topicId);
        if (!evidenceByTopic.has(key)) evidenceByTopic.set(key, []);
        evidenceByTopic.get(key).push(item);
    }

    const topicInsights = topics.map((topic) => {
        const evidence = evidenceByTopic.get(String(topic._id)) || [];
        const mastery = computeTopicMastery(evidence);
        return {
            courseId: String(topic.courseId),
            topicId: String(topic._id),
            topicTitle: topic.title,
            masteryScore: mastery.masteryScore,
            status: mastery.status,
            confidence: mastery.confidence,
            evidenceCount: mastery.evidenceCount,
            questionsAttempted: mastery.totalQuestionsAttempted,
            questionsCorrect: mastery.totalQuestionsCorrect,
            hasSufficientEvidence: mastery.status !== MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
        };
    });

    const todayKey = calendarDateKey(now, timeZone);
    const activities = (plan.scheduledActivities || []).map((activity) => {
        const matchingEvidence = activityEvidenceMatch(activity, weeklyEvidence);
        const topic = activity.topicId ? topicMap.get(String(activity.topicId)) : null;
        const topicEvidence = activity.topicId ? (evidenceByTopic.get(String(activity.topicId)) || []).filter((item) =>
            calendarDateKey(new Date(item.completedAt), timeZone) <= activity.scheduledDate
        ) : [];
        const topicMastery = topicEvidence.length ? computeTopicMastery(topicEvidence) : null;
        const isTopicReviewComplete = activity.activityType === "TOPIC_REVIEW" && topicMastery &&
            [MASTERY_STATUS.STRONG, MASTERY_STATUS.MASTERED].includes(topicMastery.status);
        const submittedButNotPassed = activity.activityType === "ASSESSMENT" && weeklyEvidence.some((item) =>
            item.sourceType === "ASSESSMENT" && String(item.sourceId) === String(activity.targetId || "") && item.passed === false
        );
        const isCompleted = matchingEvidence || Boolean(isTopicReviewComplete);
        const temporalStatus = activity.scheduledDate < todayKey ? "PAST" : activity.scheduledDate === todayKey ? "TODAY" : "UPCOMING";
        const trackable = ["PRACTICE", "ASSESSMENT", "TOPIC_REVIEW"].includes(activity.activityType);
        return {
            activityId: activity.activityId,
            activityType: activity.activityType,
            title: activity.title,
            courseId: String(activity.courseId),
            topicId: activity.topicId ? String(activity.topicId) : null,
            topicTitle: activity.topicTitle || topic?.title || null,
            targetId: activity.targetId,
            scheduledDate: activity.scheduledDate,
            temporalStatus,
            completionStatus: isCompleted ? "COMPLETED" : submittedButNotPassed ? "SUBMITTED_NOT_PASSED" : trackable ? "PENDING" : "NOT_TRACKED",
            isCompleted: Boolean(isCompleted),
            isTrackable: trackable,
        };
    });

    const completedActivities = activities.filter((activity) => activity.isCompleted).length;
    const pendingActivities = activities.filter((activity) => activity.isTrackable && !activity.isCompleted);
    const overdueActivities = pendingActivities.filter((activity) => activity.temporalStatus === "PAST");
    const activeLearningDays = new Set(weeklyEvidence.map((item) => calendarDateKey(new Date(item.completedAt), timeZone))).size;
    const currentPractice = summarizePerformance(practiceEvidence);
    const currentAssessments = summarizePerformance(assessmentEvidence);
    const currentCombined = summarizePerformance(weeklyEvidence);
    const previousPerformance = summarizePerformance(previousEvidence);
    const comparisonAvailable = previousEvidence.length > 0 && weeklyEvidence.length > 0;

    const attentionItems = [];
    if (overdueActivities.length) attentionItems.push({ type: "PENDING_ACTIVITIES", count: overdueActivities.length, message: `${overdueActivities.length} trackable scheduled activities from earlier days remain pending.` });
    const weakTopics = topicInsights.filter((topic) => topic.status === MASTERY_STATUS.NEEDS_IMPROVEMENT);
    if (weakTopics.length) attentionItems.push({ type: "TOPIC_NEEDS_IMPROVEMENT", count: weakTopics.length, message: `${weakTopics.length} topic(s) have evidence in the needs-improvement range.` });
    const insufficientTopics = topicInsights.filter((topic) => !topic.hasSufficientEvidence);
    if (insufficientTopics.length) attentionItems.push({ type: "INSUFFICIENT_TOPIC_EVIDENCE", count: insufficientTopics.length, message: `${insufficientTopics.length} topic(s) do not yet have enough eligible evidence for a mastery result.` });

    return {
        plan: { planId: String(plan._id), version: plan.version, status: plan.status, startDate, endDate, timeZone },
        learningWeek: {
            scheduledActivities: activities.length,
            completedActivities,
            pendingActivities: pendingActivities.length,
            overdueActivities: overdueActivities.length,
            activeLearningDays,
            completionPercentage: activities.length ? Number(((completedActivities / activities.length) * 100).toFixed(1)) : 0,
            activities,
        },
        performance: {
            practice: currentPractice,
            assessments: currentAssessments,
            combined: currentCombined,
            hasEvidence: weeklyEvidence.length > 0,
        },
        topicUnderstanding: {
            topics: topicInsights,
            evidenceCount: throughWeekEvidence.length,
            hasSufficientEvidence: topicInsights.some((topic) => topic.hasSufficientEvidence),
            calculation: "Existing topic mastery calculation applied to eligible evidence through the plan end date.",
        },
        attentionItems,
        nextSteps: buildNextSteps(topicInsights, pendingActivities),
        comparison: {
            available: comparisonAvailable,
            currentPeriod: { startDate, endDate, performance: currentCombined },
            previousPeriod: comparisonAvailable ? { startDate: previousStartDate, endDate: previousEndDate, performance: previousPerformance } : null,
            reason: comparisonAvailable ? null : "A comparison requires eligible evidence in both the plan period and the immediately preceding seven-day period.",
        },
    };
}
