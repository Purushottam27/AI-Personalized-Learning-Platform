import mongoose from "mongoose";
import { LearnerProfile } from "../../learner/models/learnerProfile.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { Practice } from "../../practice/models/practice.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { getLearnerRecommendationsService } from "../../recommendation/services/recommendation.service.js";
import { isTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { AssistantConversation } from "../models/assistantConversation.model.js";
import { getAiProvider } from "../../aiAssistant/providers/index.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function requireObjectId(value, field = "id") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${field}`);
    }
}

/**
 * Returns Monday and Sunday for the current (or offset) week in YYYY-MM-DD.
 */
export function getWeekDates(referenceDate = new Date()) {
    const d = new Date(referenceDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekDays = [];
    const dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    for (let i = 0; i < 7; i++) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        const isoDate = current.toISOString().split("T")[0];
        weekDays.push({
            dayOfWeek: dayNames[i],
            date: isoDate
        });
    }

    return {
        startDate: weekDays[0].date,
        endDate: weekDays[6].date,
        weekDays
    };
}

/**
 * Helper to get or default learner study preferences.
 */
export async function getLearnerStudyPreferences(learnerId) {
    const profile = await LearnerProfile.findOne({ userId: learnerId }).lean();
    const prefs = profile?.studyPreferences || {};
    
    return {
        dailyStudyTime: prefs.dailyStudyTime || "1-2 hours",
        preferredLearningFormat: prefs.preferredLearningFormat || ["Interactive Learning", "Practice Exercises"],
        studyDays: prefs.studyDays && prefs.studyDays.length > 0
            ? prefs.studyDays
            : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        preferredSessionDuration: prefs.preferredSessionDuration || 45,
        preferredTimeOfDay: prefs.preferredTimeOfDay || "ANYTIME"
    };
}

/**
 * Updates learner study scheduling preferences.
 */
export async function updateLearnerStudyPreferencesService(learnerId, updates) {
    requireObjectId(learnerId, "learnerId");

    let profile = await LearnerProfile.findOne({ userId: learnerId });
    if (!profile) {
        profile = new LearnerProfile({
            userId: learnerId,
            studyPreferences: updates
        });
    } else {
        profile.studyPreferences = {
            ...(profile.studyPreferences || {}),
            ...updates
        };
    }

    await profile.save();
    return profile.studyPreferences;
}

/**
 * Derives authoritative activity completion status from learning records.
 */
export async function evaluateActivityActualState(activity, learnerId, allEvidence, allMastery, allAttempts) {
    const { activityType, targetId, topicId, courseId } = activity;

    if (activityType === "LESSON") {
        // A lesson is completed if there is evidence on its topic or course
        const hasTopicEvidence = allEvidence.some((ev) => 
            ev.learnerId.toString() === learnerId.toString() &&
            ev.courseId.toString() === courseId.toString() &&
            (ev.topicId?.toString() === topicId?.toString() || ev.sourceId?.toString() === targetId)
        );
        return hasTopicEvidence ? "COMPLETED" : "PENDING";
    }

    if (activityType === "PRACTICE") {
        const hasPracticeEvidence = allEvidence.some((ev) =>
            ev.learnerId.toString() === learnerId.toString() &&
            ev.courseId.toString() === courseId.toString() &&
            ev.sourceType === "PRACTICE" &&
            (ev.practiceId?.toString() === targetId || ev.sourceId?.toString() === targetId)
        );
        return hasPracticeEvidence ? "COMPLETED" : "PENDING";
    }

    if (activityType === "ASSESSMENT") {
        const hasPassedAttempt = allAttempts.some((att) =>
            att.learnerId.toString() === learnerId.toString() &&
            att.assessmentId.toString() === targetId &&
            att.status === "SUBMITTED" &&
            att.passed === true
        );
        if (hasPassedAttempt) return "COMPLETED";

        const hasSubmittedAttempt = allAttempts.some((att) =>
            att.learnerId.toString() === learnerId.toString() &&
            att.assessmentId.toString() === targetId &&
            att.status === "SUBMITTED"
        );
        return hasSubmittedAttempt ? "SUBMITTED_NOT_PASSED" : "PENDING";
    }

    if (activityType === "TOPIC_REVIEW") {
        const mastery = allMastery.find((m) =>
            m.learnerId.toString() === learnerId.toString() &&
            m.topicId.toString() === topicId?.toString()
        );
        if (mastery && (mastery.status === MASTERY_STATUS.STRONG || mastery.status === MASTERY_STATUS.MASTERED)) {
            return "COMPLETED";
        }
        return "PENDING";
    }

    return "PENDING";
}

/**
 * Deterministically constructs candidate learning activities grounded in real course content.
 */
export async function collectCandidateActivities(learnerId, preferences) {
    const activeEnrollments = await Enrollment.find({
        learnerId,
        status: "ACTIVE"
    }).populate("courseId").lean();

    const candidates = [];
    const now = new Date();

    // 1. Fetch recommendations for Next Best Action alignment
    let nba = null;
    try {
        const recs = await getLearnerRecommendationsService(learnerId, { limit: 5 });
        nba = recs?.nextBestAction || null;
    } catch {
        nba = null;
    }

    // 2. Fetch TopicMastery for active courses
    const courseIds = activeEnrollments.map((e) => e.courseId?._id).filter(Boolean);
    const masteryRecords = await TopicMastery.find({
        learnerId,
        courseId: { $in: courseIds }
    }).lean();

    // Check for NEEDS_IMPROVEMENT topics (Remediation focus)
    for (const m of masteryRecords) {
        if (m.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
            const topic = await Topic.findById(m.topicId).lean();
            if (topic) {
                const practice = await Practice.findOne({ topicId: topic._id, status: "PUBLISHED" }).lean();
                if (practice) {
                    candidates.push({
                        activityId: `cand-remed-prac-${practice._id}`,
                        activityType: "PRACTICE",
                        title: `Remediation Practice: ${practice.title}`,
                        courseId: topic.courseId,
                        courseTitle: "",
                        topicId: topic._id,
                        topicTitle: topic.title,
                        targetId: practice._id.toString(),
                        estimatedDurationMinutes: preferences.preferredSessionDuration || 30,
                        rationale: `Needs improvement identified on ${topic.title}. Reinforce foundations through practice.`,
                        actionUrl: `/learner/practices/${practice._id}`,
                        priority: 1
                    });
                }
            }
        }
    }

    // Check next unlocked topics and lessons in enrolled courses
    for (const enr of activeEnrollments) {
        const course = enr.courseId;
        if (!course || (!course.isPublished && course.status !== "PUBLISHED")) continue;

        const topics = await Topic.find({ courseId: course._id }).sort({ order: 1 }).lean();

        for (const topic of topics) {
            const unlockStatus = await isTopicUnlockedForLearner(learnerId, course, topic);
            if (!unlockStatus.isUnlocked) continue;

            // Check if topic assessment passed
            const topicAssessment = await Assessment.findOne({
                courseId: course._id,
                topicId: topic._id,
                status: "PUBLISHED"
            }).lean();

            let assessmentPassed = false;
            if (topicAssessment) {
                const passedAttempt = await AssessmentAttempt.findOne({
                    assessmentId: topicAssessment._id,
                    learnerId,
                    status: "SUBMITTED",
                    passed: true
                }).lean();
                assessmentPassed = Boolean(passedAttempt);
            }

            // Find lessons in this unlocked topic
            const lessons = await Lesson.find({ topicId: topic._id }).sort({ order: 1 }).lean();
            for (const l of lessons) {
                candidates.push({
                    activityId: `cand-lesson-${l._id}`,
                    activityType: "LESSON",
                    title: `Lesson: ${l.title}`,
                    courseId: course._id,
                    courseTitle: course.title,
                    topicId: topic._id,
                    topicTitle: topic.title,
                    targetId: l._id.toString(),
                    estimatedDurationMinutes: Math.min(preferences.preferredSessionDuration || 45, 45),
                    rationale: `Continue sequential progress in ${course.title} — Topic ${topic.order}.`,
                    actionUrl: `/learner/courses/${course._id}/learn?topicId=${topic._id}&lessonId=${l._id}`,
                    priority: 2
                });
            }

            // Practice in topic
            const practice = await Practice.findOne({ topicId: topic._id, status: "PUBLISHED" }).lean();
            if (practice) {
                candidates.push({
                    activityId: `cand-practice-${practice._id}`,
                    activityType: "PRACTICE",
                    title: `Practice: ${practice.title}`,
                    courseId: course._id,
                    courseTitle: course.title,
                    topicId: topic._id,
                    topicTitle: topic.title,
                    targetId: practice._id.toString(),
                    estimatedDurationMinutes: preferences.preferredSessionDuration || 30,
                    rationale: `Apply concepts learned in ${topic.title} with formative practice.`,
                    actionUrl: `/learner/practices/${practice._id}`,
                    priority: 3
                });
            }

            // Topic Assessment if eligible and not yet passed
            if (topicAssessment && !assessmentPassed) {
                candidates.push({
                    activityId: `cand-assessment-${topicAssessment._id}`,
                    activityType: "ASSESSMENT",
                    title: `Topic Assessment: ${topicAssessment.title}`,
                    courseId: course._id,
                    courseTitle: course.title,
                    topicId: topic._id,
                    topicTitle: topic.title,
                    targetId: topicAssessment._id.toString(),
                    estimatedDurationMinutes: topicAssessment.timeLimitMinutes || 30,
                    rationale: `Formal assessment to verify mastery of Topic ${topic.order}: ${topic.title}.`,
                    actionUrl: `/learner/assessments/${topic._id}`,
                    priority: 4
                });
            }
        }
    }

    return candidates;
}

/**
 * Distributes candidates across weekly study days.
 */
export function buildDeterministicSchedule(candidates, weekInfo, preferences) {
    const studyDaysSet = new Set(preferences.studyDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    const scheduled = [];
    let candidateIndex = 0;

    for (const day of weekInfo.weekDays) {
        if (!studyDaysSet.has(day.dayOfWeek)) continue;
        if (candidateIndex >= candidates.length) {
            candidateIndex = 0; // wrap around if more study days than candidates
        }
        if (candidates.length === 0) break;

        const cand = candidates[candidateIndex];
        scheduled.push({
            activityId: `act-${day.date}-${cand.targetId || candidateIndex}`,
            dayOfWeek: day.dayOfWeek,
            scheduledDate: day.date,
            activityType: cand.activityType,
            title: cand.title,
            courseId: cand.courseId,
            courseTitle: cand.courseTitle,
            topicId: cand.topicId,
            topicTitle: cand.topicTitle,
            targetId: cand.targetId,
            estimatedDurationMinutes: cand.estimatedDurationMinutes,
            rationale: cand.rationale,
            actionUrl: cand.actionUrl,
            order: 1
        });

        candidateIndex += 1;
    }

    return scheduled;
}

/**
 * Generates or regenerates a personalized weekly study plan.
 */
export async function generateStudyPlanService(learnerId, options = {}) {
    requireObjectId(learnerId, "learnerId");

    const preferences = await getLearnerStudyPreferences(learnerId);
    const weekInfo = getWeekDates();

    // 1. Collect candidate activities grounded in real enrolled content
    const candidates = await collectCandidateActivities(learnerId, preferences);

    // 2. Schedule deterministically first as authoritative base
    const scheduledActivities = buildDeterministicSchedule(candidates, weekInfo, preferences);

    // 3. Mark previous active plan as SUPERSEDED (traceable version history)
    const existingActivePlan = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 });
    const newVersion = existingActivePlan ? existingActivePlan.version + 1 : 1;

    if (existingActivePlan) {
        existingActivePlan.status = "SUPERSEDED";
        await existingActivePlan.save();
    }

    // 4. Create new StudyPlan document
    const newPlan = new StudyPlan({
        learnerId,
        version: newVersion,
        status: "ACTIVE",
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        preferencesSnapshot: preferences,
        scheduledActivities,
        generationSource: "DETERMINISTIC_FALLBACK",
        revisionReason: options.revisionReason || "Initial personalized plan generation",
        previousPlanId: existingActivePlan?._id || null
    });

    await newPlan.save();
    return enrichPlanWithActualState(newPlan, learnerId);
}

/**
 * Enriches plan activities with real-time actual completion status.
 */
export async function enrichPlanWithActualState(planDoc, learnerId) {
    const plan = planDoc.toObject ? planDoc.toObject() : planDoc;
    const courseIds = plan.scheduledActivities.map((a) => a.courseId);

    const [allEvidence, allMastery, allAttempts] = await Promise.all([
        LearningEvidence.find({ learnerId, courseId: { $in: courseIds } }).lean(),
        TopicMastery.find({ learnerId, courseId: { $in: courseIds } }).lean(),
        AssessmentAttempt.find({ learnerId, courseId: { $in: courseIds } }).lean()
    ]);

    const todayDate = new Date().toISOString().split("T")[0];

    const enrichedActivities = [];
    let completedCount = 0;
    let pendingCount = 0;
    let missedCount = 0;

    for (const act of plan.scheduledActivities) {
        const actualState = await evaluateActivityActualState(act, learnerId, allEvidence, allMastery, allAttempts);

        let displayStatus = actualState;
        if (actualState === "PENDING" && act.scheduledDate < todayDate) {
            displayStatus = "MISSED";
            missedCount += 1;
        } else if (actualState === "COMPLETED") {
            completedCount += 1;
        } else {
            pendingCount += 1;
        }

        enrichedActivities.push({
            ...act,
            actualStatus: displayStatus,
            isCompleted: actualState === "COMPLETED",
            isToday: act.scheduledDate === todayDate
        });
    }

    const todayActivities = enrichedActivities.filter((a) => a.isToday);
    const nextActivity = todayActivities.find((a) => !a.isCompleted) || 
                         enrichedActivities.find((a) => !a.isCompleted) || 
                         null;

    return {
        ...plan,
        scheduledActivities: enrichedActivities,
        summary: {
            totalScheduled: enrichedActivities.length,
            completedCount,
            pendingCount,
            missedCount,
            progressPercentage: enrichedActivities.length > 0 
                ? Math.round((completedCount / enrichedActivities.length) * 100) 
                : 0
        },
        todayActivities,
        nextActivity
    };
}

/**
 * Retrieves the currently active study plan (or generates one if missing).
 */
export async function getActiveStudyPlanService(learnerId) {
    requireObjectId(learnerId, "learnerId");

    let activePlan = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 });
    if (!activePlan) {
        return generateStudyPlanService(learnerId, { revisionReason: "Initial plan auto-generation" });
    }

    return enrichPlanWithActualState(activePlan, learnerId);
}

/**
 * Retrieves past versions of study plans for version history inspection.
 */
export async function getStudyPlanHistoryService(learnerId) {
    requireObjectId(learnerId, "learnerId");

    const plans = await StudyPlan.find({ learnerId }).sort({ version: -1 }).lean();
    return plans.map((p) => ({
        planId: p._id.toString(),
        version: p.version,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        totalActivities: p.scheduledActivities?.length || 0,
        revisionReason: p.revisionReason,
        createdAt: p.createdAt
    }));
}

/**
 * Proposes a revised plan based on new evidence without immediately overwriting active plan.
 */
export async function proposePlanRevisionService(learnerId, reason = "Evidence update") {
    requireObjectId(learnerId, "learnerId");

    const preferences = await getLearnerStudyPreferences(learnerId);
    const weekInfo = getWeekDates();
    const candidates = await collectCandidateActivities(learnerId, preferences);
    const proposedActivities = buildDeterministicSchedule(candidates, weekInfo, preferences);

    const activePlan = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 }).lean();

    return {
        isRevisionRecommended: true,
        proposedVersion: (activePlan?.version || 1) + 1,
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        reason,
        proposedActivities,
        preferencesSnapshot: preferences
    };
}

/**
 * Accepts and activates a proposed plan revision.
 */
export async function acceptPlanRevisionService(learnerId, revisionData) {
    requireObjectId(learnerId, "learnerId");

    const existingActive = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 });
    const version = existingActive ? existingActive.version + 1 : 1;

    if (existingActive) {
        existingActive.status = "SUPERSEDED";
        await existingActive.save();
    }

    const weekInfo = getWeekDates();
    const preferences = await getLearnerStudyPreferences(learnerId);

    const newPlan = new StudyPlan({
        learnerId,
        version,
        status: "ACTIVE",
        startDate: revisionData?.startDate || weekInfo.startDate,
        endDate: revisionData?.endDate || weekInfo.endDate,
        preferencesSnapshot: preferences,
        scheduledActivities: revisionData?.proposedActivities || [],
        generationSource: "DETERMINISTIC_FALLBACK",
        revisionReason: revisionData?.reason || "Accepted plan revision",
        previousPlanId: existingActive?._id || null
    });

    await newPlan.save();
    return enrichPlanWithActualState(newPlan, learnerId);
}

/**
 * Contextual AI Learning Assistant Chat grounded in student study plan & enrolled courses.
 */
export async function chatWithAssistantService(learnerId, message, activityId = null) {
    requireObjectId(learnerId, "learnerId");
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Message cannot be empty");
    }

    // 1. Fetch learner context: active plan, current weaknesses, enrolled courses
    const activePlan = await getActiveStudyPlanService(learnerId);
    const profile = await LearnerProfile.findOne({ userId: learnerId }).lean();
    const enrollments = await Enrollment.find({ learnerId, status: "ACTIVE" }).populate("courseId").lean();
    const enrolledTitles = enrollments.map((e) => e.courseId?.title).filter(Boolean);

    let referencedActivity = null;
    if (activityId && activePlan?.scheduledActivities) {
        referencedActivity = activePlan.scheduledActivities.find((a) => a.activityId === activityId) || null;
    }

    // 2. Build Grounded Prompt
    const contextSummary = `
LEARNER STUDY CONTEXT:
- Enrolled Courses: ${enrolledTitles.join(", ") || "None"}
- Daily Study Capacity: ${profile?.studyPreferences?.dailyStudyTime || "1-2 hours"}
- Current Week Plan Progress: ${activePlan?.summary?.progressPercentage || 0}% completed (${activePlan?.summary?.completedCount || 0}/${activePlan?.summary?.totalScheduled || 0} activities)
- Today's Scheduled Count: ${activePlan?.todayActivities?.length || 0}
- Next Recommended Activity: ${activePlan?.nextActivity ? `${activePlan.nextActivity.title} (${activePlan.nextActivity.rationale})` : "None"}
${referencedActivity ? `- Current Focused Activity: ${referencedActivity.title} (${referencedActivity.activityType}) in ${referencedActivity.courseTitle}: "${referencedActivity.rationale}"` : ""}
`;

    const systemInstruction = `You are the learner's personal AI Learning Assistant for the AI Based Personalized Learning Platform.
Your purpose is to provide clear, actionable, empathetic pedagogical guidance, explain why activities are scheduled, help learners with difficult concepts, and offer encouragement based on genuine learning evidence.

STRICT BOUNDARIES:
1. Ground your answers in the learner's enrolled courses and current study schedule shown below.
2. Never award grades, pass/fail status, unlock topics, or invent fake course content.
3. If an activity was missed, reassure the learner that missed sessions do not cause failure, and guide them on how to resume without feeling overwhelmed.
4. Keep answers pedagogical, encouraging, and concise.

${contextSummary}
`;

    // 3. Query AI Provider with fallback
    let replyText = "";
    let isFallback = false;
    try {
        const provider = getAiProvider();
        const res = await provider.generateText({
            prompt: message,
            systemInstruction,
            maxOutputTokens: 600
        });
        replyText = res.text || res;
    } catch {
        isFallback = true;
        // Deterministic Fallback if AI is offline
        replyText = `I'm here to support your learning journey! Today, your primary focus is "${activePlan?.nextActivity?.title || 'to continue your enrolled coursework'}". Remember that consistent daily practice is the key to mastery. If you missed any previous sessions, don't worry—you can pick right up where you left off. Let me know if you have specific questions about your coursework!`;
    }

    // 4. Persist conversation history
    let conversation = await AssistantConversation.findOne({ learnerId });
    if (!conversation) {
        conversation = new AssistantConversation({ learnerId, messages: [] });
    }

    conversation.messages.push({
        role: "user",
        content: message.trim(),
        metadata: { referencedActivityId: activityId }
    });

    conversation.messages.push({
        role: "assistant",
        content: replyText,
        metadata: {
            usedCourseContext: enrolledTitles.length > 0,
            referencedActivityId: activityId
        }
    });

    if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
    }

    await conversation.save();

    return {
        reply: replyText,
        fallbackUsed: isFallback,
        referencedActivity,
        timestamp: new Date()
    };
}

/**
 * Retrieves assistant conversation history for the learner.
 */
export async function getAssistantConversationService(learnerId) {
    requireObjectId(learnerId, "learnerId");
    const conversation = await AssistantConversation.findOne({ learnerId }).lean();
    return conversation?.messages || [];
}
