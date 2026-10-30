import mongoose from "mongoose";
import { LearnerProfile } from "../../learner/models/learnerProfile.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { Practice } from "../../practice/models/practice.model.js";
import { PracticeAttempt } from "../../practice/models/practiceAttempt.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { LearningEvidence } from "../../learningEvidence/models/learningEvidence.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { getLearnerRecommendationsService } from "../../recommendation/services/recommendation.service.js";
import { isTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { StudyPlanProposal } from "../models/studyPlanProposal.model.js";
import { StudyPlanGenerationQuota } from "../models/studyPlanGenerationQuota.model.js";
import { AssistantConversation } from "../models/assistantConversation.model.js";
import { getAiProvider } from "../../aiAssistant/providers/index.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
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
 * Maps dailyStudyTime enum string to minutes capacity.
 */
export function parseDailyCapacityMinutes(dailyStudyTime) {
    switch (dailyStudyTime) {
        case "Less than 1 hour":
            return 45;
        case "1-2 hours":
            return 90;
        case "2-3 hours":
            return 150;
        case "3-4 hours":
            return 210;
        case "5 or more hours":
            return 300;
        default:
            return 90; // Default 1-2 hours
    }
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
 * Returns UTC calendar date string "YYYY-MM-DD".
 */
export function getUtcDateKey(date = new Date()) {
    return date.toISOString().split("T")[0];
}

/**
 * Gets study plan generation quota status for a learner for the current UTC calendar day.
 */
export async function getStudyPlanQuotaService(learnerId) {
    requireObjectId(learnerId, "learnerId");
    const dateKey = getUtcDateKey();
    const quotaDoc = await StudyPlanGenerationQuota.findOne({ learnerId, dateKey }).lean();
    const count = quotaDoc?.count || 0;
    const maxAllowed = 2;
    const remaining = Math.max(0, maxAllowed - count);

    // Calculate resetAt (next UTC midnight)
    const resetAt = new Date();
    resetAt.setUTCHours(24, 0, 0, 0);

    return {
        dateKey,
        count,
        remaining,
        maxAllowed,
        resetAt: resetAt.toISOString()
    };
}

/**
 * Atomically checks and increments the daily generation quota within a transaction session.
 * Enforces a strict limit of 2 generations per UTC calendar day.
 */
export async function checkAndConsumeGenerationQuota(learnerId, session) {
    const dateKey = getUtcDateKey();
    const maxAllowed = 2;

    const quotaDoc = await StudyPlanGenerationQuota.findOneAndUpdate(
        { learnerId, dateKey, count: { $lt: maxAllowed } },
        { $inc: { count: 1 } },
        { session, new: true, upsert: false }
    );

    if (!quotaDoc) {
        // Either document doesn't exist yet, or count has reached maxAllowed
        const existing = await StudyPlanGenerationQuota.findOne({ learnerId, dateKey }).session(session);
        if (existing && existing.count >= maxAllowed) {
            throw new ApiError(429, "QUOTA_EXCEEDED", "Daily study plan generation limit reached (maximum 2 per calendar day)");
        }

        // Try upserting initial doc with count 1
        try {
            await StudyPlanGenerationQuota.create(
                [{ learnerId, dateKey, count: 1 }],
                { session }
            );
        } catch (err) {
            if (err.code === 11000) {
                // Concurrency retry
                const retryDoc = await StudyPlanGenerationQuota.findOneAndUpdate(
                    { learnerId, dateKey, count: { $lt: maxAllowed } },
                    { $inc: { count: 1 } },
                    { session, new: true }
                );
                if (!retryDoc) {
                    throw new ApiError(429, "QUOTA_EXCEEDED", "Daily study plan generation limit reached (maximum 2 per calendar day)");
                }
            } else {
                throw err;
            }
        }
    }
}
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
 * CRITICAL RULE: Never infer lesson completion from unrelated topic-level practice/assessment evidence.
 * If no authoritative lesson completion record exists, retain PENDING/NOT_TRACKED.
 */
export async function evaluateActivityActualState(activity, learnerId, allEvidence, allMastery, allAttempts) {
    const { activityType, targetId, topicId, courseId } = activity;

    if (activityType === "LESSON") {
        // No authoritative lesson-completion model or evidence source exists in this architecture.
        // Therefore, we do NOT synthesize completion from topic practice/assessment evidence.
        return "PENDING";
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
 * Enforces rigorous eligibility on:
 * - Active learner enrollment
 * - Course publication (status: 'PUBLISHED')
 * - Topic unlock via authoritative isTopicUnlockedForLearner()
 * - Multiple formal topic assessments
 * - Strict remediation candidate eligibility
 */
export async function collectCandidateActivities(learnerId, preferences) {
    const activeEnrollments = await Enrollment.find({
        learnerId,
        status: "ACTIVE"
    }).populate("courseId").lean();

    const candidates = [];
    const courseIds = activeEnrollments
        .map((e) => e.courseId)
        .filter((c) => c && (c.status === "PUBLISHED" || c.isPublished))
        .map((c) => c._id);

    // 1. Fetch TopicMastery for active published courses
    const masteryRecords = await TopicMastery.find({
        learnerId,
        courseId: { $in: courseIds }
    }).lean();

    // Check for NEEDS_IMPROVEMENT topics (Remediation focus) with FULL eligibility checks
    for (const m of masteryRecords) {
        if (m.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
            const topic = await Topic.findById(m.topicId).lean();
            if (topic) {
                const enrollment = activeEnrollments.find(
                    (e) => e.courseId?._id?.toString() === topic.courseId.toString()
                );
                const course = enrollment?.courseId;

                // Enforce course existence, publication, active enrollment, topic ownership & unlock
                if (course && (course.status === "PUBLISHED" || course.isPublished)) {
                    const unlockStatus = await isTopicUnlockedForLearner(learnerId, course, topic);
                    if (unlockStatus.isUnlocked) {
                        const practices = await Practice.find({
                            topicId: topic._id,
                            status: "PUBLISHED"
                        }).lean();

                        for (const practice of practices) {
                            // Exclude if learner has authoritative practice evidence
                            const hasEvidence = await LearningEvidence.exists({
                                learnerId,
                                sourceType: "PRACTICE",
                                $or: [{ practiceId: practice._id }, { sourceId: practice._id }]
                            });
                            if (hasEvidence) continue;

                            candidates.push({
                                activityId: `cand-remed-prac-${practice._id}`,
                                activityType: "PRACTICE",
                                title: `Remediation Practice: ${practice.title}`,
                                courseId: topic.courseId,
                                courseTitle: course.title,
                                topicId: topic._id,
                                topicTitle: topic.title,
                                targetId: practice._id.toString(),
                                estimatedDurationMinutes: preferences.preferredSessionDuration || 30,
                                durationAllocationType: "PLANNING_ALLOCATION",
                                rationale: `Needs improvement identified on ${topic.title}. Reinforce foundations through targeted practice.`,
                                actionUrl: `/learner/practices/${practice._id}`,
                                priority: 1
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Discover unlocked topic lessons, practices, and formal assessments in enrolled courses
    for (const enr of activeEnrollments) {
        const course = enr.courseId;
        if (!course || (!course.isPublished && course.status !== "PUBLISHED")) continue;

        const topics = await Topic.find({ courseId: course._id }).sort({ order: 1 }).lean();

        for (const topic of topics) {
            const unlockStatus = await isTopicUnlockedForLearner(learnerId, course, topic);
            if (!unlockStatus.isUnlocked) continue;

            // Find lessons in this unlocked topic
            const lessons = await Lesson.find({ topicId: topic._id }).sort({ order: 1 }).lean();
            for (const l of lessons) {
                // If lesson has a genuine estimated duration, mark ESTIMATED; otherwise PLANNING_ALLOCATION
                const hasExplicitDuration = typeof l.estimatedDuration === "number" && l.estimatedDuration > 0;
                const allocatedMinutes = hasExplicitDuration
                    ? l.estimatedDuration
                    : Math.min(preferences.preferredSessionDuration || 45, 45);

                candidates.push({
                    activityId: `cand-lesson-${l._id}`,
                    activityType: "LESSON",
                    title: `Lesson: ${l.title}`,
                    courseId: course._id,
                    courseTitle: course.title,
                    topicId: topic._id,
                    topicTitle: topic.title,
                    targetId: l._id.toString(),
                    estimatedDurationMinutes: allocatedMinutes,
                    durationAllocationType: hasExplicitDuration ? "ESTIMATED" : "PLANNING_ALLOCATION",
                    rationale: `Continue sequential progress in ${course.title} — Topic ${topic.order}.`,
                    actionUrl: `/learner/courses/${course._id}/learn?topicId=${topic._id}&lessonId=${l._id}`,
                    priority: 2
                });
            }

            // Practices in this topic
            const practices = await Practice.find({ topicId: topic._id, status: "PUBLISHED" }).lean();
            for (const practice of practices) {
                // Skip if already added in remediation
                if (!candidates.some((c) => c.targetId === practice._id.toString())) {
                    // Exclude if learner already has authoritative practice evidence
                    const hasEvidence = await LearningEvidence.exists({
                        learnerId,
                        sourceType: "PRACTICE",
                        $or: [{ practiceId: practice._id }, { sourceId: practice._id }]
                    });
                    if (hasEvidence) continue;

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
                        durationAllocationType: "PLANNING_ALLOCATION",
                        rationale: `Apply concepts learned in ${topic.title} with formative practice.`,
                        actionUrl: `/learner/practices/${practice._id}`,
                        priority: 3
                    });
                }
            }

            // Multiple formal topic assessments: find all published TOPIC assessments
            const topicAssessments = await Assessment.find({
                courseId: course._id,
                topicId: topic._id,
                type: "TOPIC",
                status: "PUBLISHED"
            }).lean();

            for (const tAssessment of topicAssessments) {
                const passedAttempt = await AssessmentAttempt.findOne({
                    assessmentId: tAssessment._id,
                    learnerId,
                    status: "SUBMITTED",
                    passed: true
                }).lean();

                if (!passedAttempt) {
                    const hasExplicitLimit = typeof tAssessment.timeLimitMinutes === "number" && tAssessment.timeLimitMinutes > 0;
                    candidates.push({
                        activityId: `cand-assessment-${tAssessment._id}`,
                        activityType: "ASSESSMENT",
                        title: `Topic Assessment: ${tAssessment.title}`,
                        courseId: course._id,
                        courseTitle: course.title,
                        topicId: topic._id,
                        topicTitle: topic.title,
                        targetId: tAssessment._id.toString(),
                        estimatedDurationMinutes: hasExplicitLimit ? tAssessment.timeLimitMinutes : (preferences.preferredSessionDuration || 30),
                        durationAllocationType: hasExplicitLimit ? "ESTIMATED" : "PLANNING_ALLOCATION",
                        rationale: `Formal assessment to verify mastery of Topic ${topic.order}: ${topic.title}.`,
                        actionUrl: `/learner/assessments/${topic._id}`,
                        priority: 4
                    });
                }
            }
        }
    }

    return candidates;
}

/**
 * Distributes candidates across weekly study days strictly respecting:
 * 1. Selected studyDays
 * 2. dailyStudyTime capacity (minutes per day)
 * 3. preferredSessionDuration
 * 4. NEVER duplicating an activity via wrap-around once the candidate list is exhausted
 * 5. Balanced round-robin distribution across selected study days so activities do not cluster exclusively on Monday
 * 6. Daily capacity constraint is strictly enforced on every activity including the very first
 */
export function buildDeterministicSchedule(candidates, weekInfo, preferences) {
    const studyDaysSet = new Set(preferences.studyDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    const dailyCapacityMinutes = parseDailyCapacityMinutes(preferences.dailyStudyTime);
    
    // Filter active weekDays based on learner's selected study days
    const activeStudyDays = weekInfo.weekDays.filter((d) => studyDaysSet.has(d.dayOfWeek));
    if (activeStudyDays.length === 0 || !candidates || candidates.length === 0) {
        return [];
    }

    const scheduled = [];
    const dayAllocations = new Map(); // date -> { totalMinutes, order }
    activeStudyDays.forEach((d) => {
        dayAllocations.set(d.date, { totalMinutes: 0, order: 1 });
    });

    let currentDayIndex = 0;
    let candidateIndex = 0;

    // Distribute candidates across the selected study days
    while (candidateIndex < candidates.length) {
        let placed = false;
        const initialDayIndex = currentDayIndex;

        // Try placing the current candidate on currentDayIndex or next available active day
        for (let attempt = 0; attempt < activeStudyDays.length; attempt++) {
            const day = activeStudyDays[(initialDayIndex + attempt) % activeStudyDays.length];
            const alloc = dayAllocations.get(day.date);
            const cand = candidates[candidateIndex];
            const activityDuration = cand.estimatedDurationMinutes || preferences.preferredSessionDuration || 30;

            // Strict daily capacity allocation check: NEVER schedule if exceeding daily capacity
            if (alloc.totalMinutes + activityDuration <= dailyCapacityMinutes) {
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
                    estimatedDurationMinutes: activityDuration,
                    durationAllocationType: cand.durationAllocationType || "PLANNING_ALLOCATION",
                    rationale: cand.rationale,
                    actionUrl: cand.actionUrl,
                    order: alloc.order
                });

                alloc.totalMinutes += activityDuration;
                alloc.order += 1;
                placed = true;
                currentDayIndex = (initialDayIndex + attempt + 1) % activeStudyDays.length;
                break;
            }
        }

        // Advance to next candidate whether placed or skipped due to oversized duration
        candidateIndex += 1;

        // If no day had enough capacity for this candidate, and all days are full, stop scheduling
        if (!placed) {
            const allDaysFull = activeStudyDays.every((d) => {
                const a = dayAllocations.get(d.date);
                return a.totalMinutes >= dailyCapacityMinutes;
            });
            if (allDaysFull) {
                break;
            }
        }
    }

    // Sort scheduled activities chronologically by date and within-day order
    scheduled.sort((a, b) => {
        if (a.scheduledDate !== b.scheduledDate) {
            return a.scheduledDate.localeCompare(b.scheduledDate);
        }
        return a.order - b.order;
    });

    return scheduled;
}

export const SUPPORTED_ACTIVITY_TYPES = Object.freeze(["LESSON", "PRACTICE", "ASSESSMENT"]);

/**
 * Revalidates an array of activity specifications against current authoritative data.
 * Throws ApiError(400) if any activity is invalid, inaccessible, locked, or forged.
 */
export async function revalidateActivities(learnerId, activities) {
    if (!Array.isArray(activities) || activities.length === 0) {
        return [];
    }

    const revalidated = [];

    // Pre-fetch active enrollments
    const activeEnrollments = await Enrollment.find({
        learnerId,
        status: "ACTIVE"
    }).populate("courseId").lean();

    const activeCourseMap = new Map();
    for (const enr of activeEnrollments) {
        if (enr.courseId && (enr.courseId.status === "PUBLISHED" || enr.courseId.isPublished)) {
            activeCourseMap.set(enr.courseId._id.toString(), enr.courseId);
        }
    }

    let orderCounter = 1;
    for (const act of activities) {
        // 1. Strict activity type check
        if (!SUPPORTED_ACTIVITY_TYPES.includes(act.activityType)) {
            throw new ApiError(400, "VALIDATION_ERROR", `Unsupported activity type: ${act.activityType}. Only LESSON, PRACTICE, and ASSESSMENT are permitted.`);
        }

        // 2. Strict ObjectId checks
        requireObjectId(act.courseId, "courseId");
        if (act.topicId) {
            requireObjectId(act.topicId, "topicId");
        }
        if (act.targetId) {
            requireObjectId(act.targetId, "targetId");
        }

        // 3. Strict scheduled date & day of week validation
        if (!act.scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(act.scheduledDate)) {
            throw new ApiError(400, "VALIDATION_ERROR", "Invalid or missing scheduledDate format (must be YYYY-MM-DD)");
        }
        const validDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
        if (!validDays.includes(act.dayOfWeek)) {
            throw new ApiError(400, "VALIDATION_ERROR", `Invalid dayOfWeek: ${act.dayOfWeek}`);
        }

        const course = activeCourseMap.get(act.courseId.toString());
        if (!course) {
            throw new ApiError(400, "VALIDATION_ERROR", `Course ${act.courseId} is not active or published for learner`);
        }

        let topic = null;
        if (act.topicId) {
            topic = await Topic.findById(act.topicId).lean();
            if (!topic || topic.courseId.toString() !== course._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Topic does not belong to specified course");
            }

            const unlockStatus = await isTopicUnlockedForLearner(learnerId, course, topic);
            if (!unlockStatus.isUnlocked) {
                throw new ApiError(400, "VALIDATION_ERROR", `Topic ${topic.title} is currently locked for learner`);
            }
        }

        // Authoritatively check target
        let authoritativeTitle = act.title;
        let authoritativeActionUrl = act.actionUrl;
        let duration = act.estimatedDurationMinutes || 30;
        let durationAllocationType = "PLANNING_ALLOCATION";

        if (act.activityType === "LESSON") {
            const lesson = await Lesson.findById(act.targetId).lean();
            if (!lesson || !topic || lesson.topicId.toString() !== topic._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target lesson not found or does not belong to topic");
            }
            authoritativeTitle = `Lesson: ${lesson.title}`;
            authoritativeActionUrl = `/learner/courses/${course._id}/learn?topicId=${topic._id}&lessonId=${lesson._id}`;
            if (typeof lesson.estimatedDuration === "number" && lesson.estimatedDuration > 0) {
                duration = lesson.estimatedDuration;
                durationAllocationType = "ESTIMATED";
            }
        } else if (act.activityType === "PRACTICE") {
            const practice = await Practice.findById(act.targetId).lean();
            if (!practice || practice.status !== "PUBLISHED") {
                throw new ApiError(400, "VALIDATION_ERROR", "Target practice not found or not published");
            }
            // Validate practice topic ownership if practice has a topicId or if topic was specified
            if (topic && practice.topicId && practice.topicId.toString() !== topic._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target practice does not belong to specified topic");
            }
            authoritativeTitle = `Practice: ${practice.title}`;
            authoritativeActionUrl = `/learner/practices/${practice._id}`;
        } else if (act.activityType === "ASSESSMENT") {
            const assessment = await Assessment.findById(act.targetId).lean();
            if (!assessment || assessment.status !== "PUBLISHED") {
                throw new ApiError(400, "VALIDATION_ERROR", "Target assessment not found or not published");
            }
            // Course-level or topic-level assessment check
            if (assessment.courseId.toString() !== course._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target assessment does not belong to specified course");
            }
            if (topic && assessment.topicId && assessment.topicId.toString() !== topic._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target assessment does not belong to specified topic");
            }
            authoritativeTitle = `${assessment.type} Assessment: ${assessment.title}`;
            authoritativeActionUrl = `/learner/assessments/${topic?._id || course._id}`;
            if (typeof assessment.timeLimitMinutes === "number" && assessment.timeLimitMinutes > 0) {
                duration = assessment.timeLimitMinutes;
                durationAllocationType = "ESTIMATED";
            }
        }

        revalidated.push({
            activityId: act.activityId || `act-${act.scheduledDate}-${act.targetId || orderCounter}`,
            dayOfWeek: act.dayOfWeek,
            scheduledDate: act.scheduledDate,
            activityType: act.activityType,
            title: authoritativeTitle,
            courseId: course._id,
            courseTitle: course.title,
            topicId: topic ? topic._id : null,
            topicTitle: topic ? topic.title : null,
            targetId: act.targetId,
            estimatedDurationMinutes: duration,
            durationAllocationType,
            rationale: act.rationale || "Scheduled study session",
            actionUrl: authoritativeActionUrl,
            order: act.order || orderCounter
        });

        orderCounter += 1;
    }

    return revalidated;
}

/**
 * Checks if two activity sets represent a meaningful difference.
 */
function areActivitySchedulesMeaningfullyDifferent(currentActivities = [], proposedActivities = []) {
    if (currentActivities.length !== proposedActivities.length) return true;
    for (let i = 0; i < currentActivities.length; i++) {
        const c = currentActivities[i];
        const p = proposedActivities[i];
        if (
            c.targetId !== p.targetId ||
            c.scheduledDate !== p.scheduledDate ||
            c.activityType !== p.activityType
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Generates or regenerates a personalized weekly study plan safely.
 * Atomic active plan replacement to avoid leaving the learner without an active plan.
 */
export async function generateStudyPlanService(learnerId, options = {}) {
    requireObjectId(learnerId, "learnerId");

    const preferences = await getLearnerStudyPreferences(learnerId);
    const weekInfo = getWeekDates();

    // 1. Collect candidate activities grounded in real enrolled content
    const candidates = await collectCandidateActivities(learnerId, preferences);

    // 2. Schedule deterministically first as authoritative base
    const scheduledActivities = buildDeterministicSchedule(candidates, weekInfo, preferences);

    // 3. Concurrency-safe plan creation, quota enforcement, and superseding via transaction
    const savedPlan = await withTransaction(async (session) => {
        // Enforce 2 generations per calendar day quota (atomic check & increment)
        await checkAndConsumeGenerationQuota(learnerId, session);

        const existingActivePlan = await StudyPlan.findOne({ learnerId, status: "ACTIVE" })
            .sort({ version: -1 })
            .session(session);

        const newVersion = existingActivePlan ? existingActivePlan.version + 1 : 1;

        if (existingActivePlan) {
            existingActivePlan.status = "SUPERSEDED";
            await existingActivePlan.save({ session });
        }

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

        await newPlan.save({ session });
        return newPlan;
    });

    return enrichPlanWithActualState(savedPlan, learnerId);
}

/**
 * Enriches plan activities with real-time actual completion status.
 */
export async function enrichPlanWithActualState(planDoc, learnerId) {
    const plan = planDoc.toObject ? planDoc.toObject() : planDoc;
    const courseIds = (plan.scheduledActivities || []).map((a) => a.courseId);

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

    for (const act of plan.scheduledActivities || []) {
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
            isToday: act.scheduledDate === todayDate,
            isUntrackedCompletion: act.activityType === "LESSON"
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
 * Proposes a revised plan based on new evidence or preference changes.
 * PERSISTS a server-owned StudyPlanProposal with expiry and meaningful change detection.
 */
export async function proposePlanRevisionService(learnerId, reason = "Evidence update") {
    requireObjectId(learnerId, "learnerId");

    const preferences = await getLearnerStudyPreferences(learnerId);
    const weekInfo = getWeekDates();
    const candidates = await collectCandidateActivities(learnerId, preferences);
    const proposedActivities = buildDeterministicSchedule(candidates, weekInfo, preferences);

    const activePlan = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 }).lean();
    const basedOnVersion = activePlan?.version || 1;
    const proposedVersion = basedOnVersion + 1;

    // Detect if there is a meaningful change compared to the active plan
    const isDifferent = areActivitySchedulesMeaningfullyDifferent(
        activePlan?.scheduledActivities || [],
        proposedActivities
    );

    // Expire any existing pending proposals for this learner
    await StudyPlanProposal.updateMany(
        { learnerId, status: "PENDING" },
        { status: "EXPIRED" }
    );

    // Save a new server-owned proposal valid for 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const proposal = new StudyPlanProposal({
        learnerId,
        basedOnPlanId: activePlan?._id || null,
        basedOnVersion,
        proposedVersion,
        status: "PENDING",
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        reason,
        isRevisionRecommended: isDifferent,
        proposedActivities,
        preferencesSnapshot: preferences,
        expiresAt
    });

    await proposal.save();

    return {
        proposalId: proposal._id.toString(),
        isRevisionRecommended: isDifferent,
        proposedVersion,
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        reason,
        proposedActivities,
        preferencesSnapshot: preferences,
        expiresAt: proposal.expiresAt
    };
}

/**
 * Accepts and activates a proposed plan revision.
 * Mandatory proposal acceptance: requires valid, server-owned, unexpired StudyPlanProposal.
 * Validates ownership, proposal existence, staleness/expiry, plan version match,
 * and revalidates all activities authoritatively before atomic plan replacement.
 * Uses withTransaction so proposal status update and active plan replacement succeed or fail together.
 */
export async function acceptPlanRevisionService(learnerId, revisionData) {
    requireObjectId(learnerId, "learnerId");

    const proposalId = revisionData?.proposalId;
    if (!proposalId) {
        throw new ApiError(400, "VALIDATION_ERROR", "Missing proposalId. Acceptance requires a valid revision proposal.");
    }
    requireObjectId(proposalId, "proposalId");

    // Pre-check proposal existence, ownership, expiry
    const existingProposal = await StudyPlanProposal.findById(proposalId);
    if (!existingProposal) {
        throw new ApiError(404, "PROPOSAL_NOT_FOUND", "Revision proposal not found");
    }

    if (existingProposal.learnerId.toString() !== learnerId.toString()) {
        throw new ApiError(403, "FORBIDDEN", "You do not own this revision proposal");
    }

    if (existingProposal.status !== "PENDING" || existingProposal.expiresAt < new Date()) {
        throw new ApiError(409, "PROPOSAL_STALE", "This revision proposal is expired or already resolved");
    }

    const currentActive = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 }).lean();
    if (currentActive && currentActive.version !== existingProposal.basedOnVersion) {
        existingProposal.status = "EXPIRED";
        await existingProposal.save();
        throw new ApiError(409, "PROPOSAL_STALE", "Active study plan has evolved since this proposal was created");
    }

    // Authoritative Server-Side Revalidation of each activity before transaction
    const revalidatedActivities = await revalidateActivities(learnerId, existingProposal.proposedActivities);
    const weekInfo = getWeekDates();
    const preferences = await getLearnerStudyPreferences(learnerId);

    // Atomically accept proposal and supersede active plan
    const newActivePlan = await withTransaction(async (session) => {
        // Atomic conditional update on proposal
        const updatedProposal = await StudyPlanProposal.findOneAndUpdate(
            {
                _id: proposalId,
                learnerId,
                status: "PENDING",
                expiresAt: { $gt: new Date() },
                basedOnVersion: currentActive ? currentActive.version : existingProposal.basedOnVersion
            },
            { $set: { status: "ACCEPTED" } },
            { session, new: true }
        );

        if (!updatedProposal) {
            throw new ApiError(409, "PROPOSAL_STALE", "Revision proposal could not be accepted due to concurrent resolution or status change");
        }

        const existingActive = await StudyPlan.findOne({ learnerId, status: "ACTIVE" })
            .sort({ version: -1 })
            .session(session);

        const version = existingActive ? existingActive.version + 1 : (existingProposal.proposedVersion || 1);

        if (existingActive) {
            existingActive.status = "SUPERSEDED";
            await existingActive.save({ session });
        }

        const newPlan = new StudyPlan({
            learnerId,
            version,
            status: "ACTIVE",
            startDate: updatedProposal.startDate || weekInfo.startDate,
            endDate: updatedProposal.endDate || weekInfo.endDate,
            preferencesSnapshot: preferences,
            scheduledActivities: revalidatedActivities,
            generationSource: "DETERMINISTIC_FALLBACK",
            revisionReason: updatedProposal.reason || "Accepted plan revision",
            previousPlanId: existingActive?._id || null
        });

        await newPlan.save({ session });
        return newPlan;
    });

    return enrichPlanWithActualState(newActivePlan, learnerId);
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

    // 3. Load recent conversation history (last 6 messages) for multi-turn context
    let conversation = await AssistantConversation.findOne({ learnerId });
    if (!conversation) {
        conversation = new AssistantConversation({ learnerId, messages: [] });
    }

    const recentHistory = (conversation.messages || [])
        .slice(-6)
        .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content
        }));

    // 4. Query AI Provider with conversation history and deterministic fallback
    let replyText = "";
    let isFallback = false;
    try {
        const provider = getAiProvider();
        const res = await provider.generateText({
            prompt: message,
            systemInstruction,
            history: recentHistory,
            maxOutputTokens: 600
        });
        replyText = res.text || res;
    } catch {
        isFallback = true;
        // Deterministic Fallback if AI is offline, rate-limited, or network blocked
        replyText = `I'm here to support your learning journey! Today, your primary focus is "${activePlan?.nextActivity?.title || 'to continue your enrolled coursework'}". Remember that consistent daily practice is the key to mastery. If you missed any previous sessions, don't worry—you can pick right up where you left off. Let me know if you have specific questions about your coursework!`;
    }

    // 5. Persist conversation history
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
            referencedActivityId: activityId,
            fallbackUsed: isFallback
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
