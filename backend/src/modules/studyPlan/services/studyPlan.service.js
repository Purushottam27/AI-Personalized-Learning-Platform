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
export function getWeekDates(referenceDate = new Date(), timeZone = getApplicationTimezone()) {
    const dateKey = getCalendarDateKey(referenceDate, timeZone);
    const [year, month, day] = dateKey.split("-").map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = calendarDate.getUTCDay(); // 0 Sunday
    const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
    calendarDate.setUTCDate(calendarDate.getUTCDate() + diffToMonday);

    const dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const weekDays = dayNames.map((dayOfWeek, index) => {
        const current = new Date(calendarDate);
        current.setUTCDate(calendarDate.getUTCDate() + index);
        return { dayOfWeek, date: current.toISOString().slice(0, 10) };
    });

    return { startDate: weekDays[0].date, endDate: weekDays[6].date, weekDays };
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
 * Authoritative timezone resolution.
 * If learner profile or application specifies a timezone in the future, it is resolved here.
 * Currently uses APP_TIMEZONE from environment or defaults to UTC, adhering to ISO 8601 calendar days.
 */
export function getApplicationTimezone() {
    return process.env.APP_TIMEZONE || "UTC";
}

/**
 * Returns calendar date string "YYYY-MM-DD" in the application's established timezone.
 */
export function getCalendarDateKey(date = new Date(), timeZone = getApplicationTimezone()) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date);
        const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    } catch {
        return date.toISOString().split("T")[0];
    }
}

/**
 * Computes next calendar day midnight reset timestamp in the specified timezone.
 */
function getZonedDateTimeParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

/** Convert a wall-clock date/time in an IANA timezone to its UTC instant. */
function zonedDateTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    let candidate = targetAsUtc;
    // Iteratively correct the offset; this handles non-hour offsets and DST.
    for (let i = 0; i < 4; i += 1) {
        const actual = getZonedDateTimeParts(new Date(candidate), timeZone);
        const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
        const delta = targetAsUtc - actualAsUtc;
        if (delta === 0) break;
        candidate += delta;
    }
    return new Date(candidate);
}

export function getNextMidnightResetAt(date = new Date(), timeZone = getApplicationTimezone()) {
    const todayDateKey = getCalendarDateKey(date, timeZone);
    const [year, month, day] = todayDateKey.split("-").map(Number);
    const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1));
    const nextLocalMidnight = {
        year: nextCalendarDay.getUTCFullYear(),
        month: nextCalendarDay.getUTCMonth() + 1,
        day: nextCalendarDay.getUTCDate(),
        hour: 0, minute: 0, second: 0
    };
    return zonedDateTimeToUtc(nextLocalMidnight, timeZone).toISOString();
}

/**
 * Gets study plan generation quota status for a learner for the current calendar day.
 */
export async function getStudyPlanQuotaService(learnerId) {
    requireObjectId(learnerId, "learnerId");
    const timeZone = getApplicationTimezone();
    const dateKey = getCalendarDateKey(new Date(), timeZone);
    const quotaDoc = await StudyPlanGenerationQuota.findOne({ learnerId, dateKey }).lean();
    const count = quotaDoc?.count || 0;
    const maxAllowed = 2;
    const remaining = Math.max(0, maxAllowed - count);
    const resetAt = getNextMidnightResetAt(new Date(), timeZone);

    return {
        dateKey,
        count,
        remaining,
        maxAllowed,
        timeZone,
        resetAt
    };
}

/**
 * Atomically checks and increments the daily generation quota within a transaction session.
 * Enforces a strict limit of 2 generations per calendar day.
 */
export async function ensureGenerationQuotaDocument(learnerId, date = new Date()) {
    const timeZone = getApplicationTimezone();
    const dateKey = getCalendarDateKey(date, timeZone);
    try {
        await StudyPlanGenerationQuota.findOneAndUpdate(
            { learnerId, dateKey },
            { $setOnInsert: { learnerId, dateKey, count: 0 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        // Concurrent upserts may race on the unique (learnerId, dateKey) index.
        // The winning insert is authoritative; read it outside a transaction.
        if (error?.code !== 11000) throw error;
        const existing = await StudyPlanGenerationQuota.findOne({ learnerId, dateKey }).lean();
        if (!existing) throw error;
    }
    return dateKey;
}

export async function checkAndConsumeGenerationQuota(learnerId, session, date = new Date(), dateKeyOverride = null) {
    const timeZone = getApplicationTimezone();
    const dateKey = dateKeyOverride || getCalendarDateKey(date, timeZone);
    const maxAllowed = 2;
    const updated = await StudyPlanGenerationQuota.findOneAndUpdate(
        { learnerId, dateKey, count: { $lt: maxAllowed } },
        { $inc: { count: 1 } },
        { session, new: true, upsert: false }
    );
    if (!updated) {
        throw new ApiError(429, "QUOTA_EXCEEDED", "Daily study plan generation limit reached (maximum 2 per calendar day)");
    }
    return updated;
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

                            // Exclude if learner has a submitted practice attempt with passing score (>= 60%) or 100% completion
                            const passedAttempt = await PracticeAttempt.exists({
                                practiceId: practice._id,
                                learnerId,
                                status: "SUBMITTED",
                                scorePercent: { $gte: 60 }
                            });
                            if (passedAttempt) continue;

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

                    // Exclude if learner has a submitted practice attempt with passing score (>= 60%)
                    const passedAttempt = await PracticeAttempt.exists({
                        practiceId: practice._id,
                        learnerId,
                        status: "SUBMITTED",
                        scorePercent: { $gte: 60 }
                    });
                    if (passedAttempt) continue;

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
 * Distributes candidates across all seven calendar days strictly respecting:
 * 1. Preferred studyDays as ordering preference
 * 2. dailyStudyTime capacity (minutes per day)
 * 3. preferredSessionDuration
 * 4. NEVER duplicating an activity via wrap-around once the candidate list is exhausted
 * 5. Balanced round-robin distribution across selected study days so activities do not cluster exclusively on Monday
 * 6. Daily capacity constraint is strictly enforced on every activity including the very first
 * 7. Every day is represented in the returned plan; days without eligible candidates are rest days
 */
export function buildDeterministicSchedule(candidates, weekInfo, preferences = {}) {
    const calendarDays = Array.isArray(weekInfo?.weekDays) ? weekInfo.weekDays : [];
    const dailyCapacityMinutes = parseDailyCapacityMinutes(preferences.dailyStudyTime);

    if (calendarDays.length === 0 || !Array.isArray(candidates) || candidates.length === 0) {
        return [];
    }

    // Keep the complete calendar week available. studyDays expresses preference,
    // not permission to remove the other days from the learner's weekly plan.
    const preferredDays = new Set(preferences.studyDays || []);
    const orderedDays = [
        ...calendarDays.filter((day) => preferredDays.has(day.dayOfWeek)),
        ...calendarDays.filter((day) => !preferredDays.has(day.dayOfWeek))
    ];

    const dayAllocations = new Map();
    orderedDays.forEach((day) => {
        dayAllocations.set(day.date, { totalMinutes: 0, order: 1 });
    });

    const scheduled = [];
    let currentDayIndex = 0;

    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidate = candidates[candidateIndex];
        const activityDuration =
            candidate.estimatedDurationMinutes ||
            preferences.preferredSessionDuration ||
            30;

        // Find the next day with enough remaining capacity. Keep using the
        // current day while another activity fits, allowing multiple activities
        // per day without exceeding the learner's daily capacity.
        let placed = false;
        for (let offset = 0; offset < orderedDays.length; offset += 1) {
            const dayIndex = (currentDayIndex + offset) % orderedDays.length;
            const day = orderedDays[dayIndex];
            const allocation = dayAllocations.get(day.date);

            if (allocation.totalMinutes + activityDuration > dailyCapacityMinutes) {
                continue;
            }

            scheduled.push({
                activityId: `act-${day.date}-${candidate.targetId || candidateIndex}`,
                dayOfWeek: day.dayOfWeek,
                scheduledDate: day.date,
                activityType: candidate.activityType,
                title: candidate.title,
                courseId: candidate.courseId,
                courseTitle: candidate.courseTitle,
                topicId: candidate.topicId,
                topicTitle: candidate.topicTitle,
                targetId: candidate.targetId,
                estimatedDurationMinutes: activityDuration,
                durationAllocationType: candidate.durationAllocationType || "PLANNING_ALLOCATION",
                rationale: candidate.rationale,
                actionUrl: candidate.actionUrl,
                order: allocation.order
            });

            allocation.totalMinutes += activityDuration;
            allocation.order += 1;
            currentDayIndex = dayIndex;
            placed = true;
            break;
        }

        // No remaining day can fit this activity; later candidates cannot be
        // assumed to be smaller, so stop rather than silently over-allocate.
        if (!placed) {
            break;
        }
    }

    return scheduled.sort((a, b) => {
        if (a.scheduledDate !== b.scheduledDate) {
            return a.scheduledDate.localeCompare(b.scheduledDate);
        }
        return a.order - b.order;
    });
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
            // Enforce course association
            if (practice.courseId.toString() !== course._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target practice does not belong to specified course");
            }
            // If topic is specified in activity, practice must belong to that exact topic
            if (topic) {
                if (!practice.topicId || practice.topicId.toString() !== topic._id.toString()) {
                    throw new ApiError(400, "VALIDATION_ERROR", "Target practice does not belong to specified topic");
                }
            } else if (practice.topicId) {
                // If activity omitted topic but practice is topic-scoped, reject or assign topic
                throw new ApiError(400, "VALIDATION_ERROR", "Topic-scoped practice activity must specify its topicId");
            }
            authoritativeTitle = `Practice: ${practice.title}`;
            authoritativeActionUrl = `/learner/practices/${practice._id}`;
        } else if (act.activityType === "ASSESSMENT") {
            const assessment = await Assessment.findById(act.targetId).lean();
            if (!assessment || assessment.status !== "PUBLISHED") {
                throw new ApiError(400, "VALIDATION_ERROR", "Target assessment not found or not published");
            }
            // Enforce course association
            if (assessment.courseId.toString() !== course._id.toString()) {
                throw new ApiError(400, "VALIDATION_ERROR", "Target assessment does not belong to specified course");
            }
            // If activity type is topic-level (or topic specified), enforce exact topic match and type
            if (assessment.type === "TOPIC") {
                if (!topic || !assessment.topicId || assessment.topicId.toString() !== topic._id.toString()) {
                    throw new ApiError(400, "VALIDATION_ERROR", "Topic assessment requires matching topicId and cannot be scheduled cross-topic or topicless");
                }
            } else {
                // DIAGNOSTIC or FINAL assessment (course-level)
                if (topic || act.topicId) {
                    throw new ApiError(400, "VALIDATION_ERROR", "Course-level assessment (DIAGNOSTIC or FINAL) cannot be scheduled as a topic-specific activity");
                }
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

    // Create the unique daily quota row before entering the transaction. This avoids
    // recovering from duplicate-key errors inside an already-aborted transaction.
    const quotaDateKey = await ensureGenerationQuotaDocument(learnerId);

    // 3. Concurrency-safe plan creation, quota enforcement, and superseding via transaction
    const savedPlan = await withTransaction(async (session) => {
        // Use the same calendar date key captured before the transaction, even if
        // the request happens to cross local midnight while it is being processed.
        await checkAndConsumeGenerationQuota(learnerId, session, new Date(), quotaDateKey);

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
    const courseIds = [...new Set((plan.scheduledActivities || []).map((a) => String(a.courseId)))];

    const [allEvidence, allMastery, allAttempts] = await Promise.all([
        LearningEvidence.find({ learnerId, courseId: { $in: courseIds } }).lean(),
        TopicMastery.find({ learnerId, courseId: { $in: courseIds } }).lean(),
        AssessmentAttempt.find({ learnerId, courseId: { $in: courseIds } }).lean()
    ]);

    const todayDate = getCalendarDateKey(new Date(), getApplicationTimezone());
    const dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const [sy, sm, sd] = String(plan.startDate).split("-").map(Number);
    const startUtc = new Date(Date.UTC(sy, sm - 1, sd));
    const calendarDays = dayNames.map((dayOfWeek, index) => {
        const d = new Date(startUtc);
        d.setUTCDate(startUtc.getUTCDate() + index);
        const date = d.toISOString().slice(0, 10);
        return { dayOfWeek, date };
    });

    const enrichedActivities = [];
    let completedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const act of plan.scheduledActivities || []) {
        const actualState = await evaluateActivityActualState(act, learnerId, allEvidence, allMastery, allAttempts);
        const temporalStatus = act.scheduledDate < todayDate
            ? "PAST"
            : act.scheduledDate === todayDate ? "TODAY" : "UPCOMING";

        if (actualState === "COMPLETED") completedCount += 1;
        else {
            pendingCount += 1;
            if (temporalStatus === "PAST") overdueCount += 1;
        }

        enrichedActivities.push({
            ...act,
            actualStatus: actualState === "COMPLETED" ? "COMPLETED" : actualState,
            temporalStatus,
            isCompleted: actualState === "COMPLETED",
            isToday: temporalStatus === "TODAY",
            isUntrackedCompletion: act.activityType === "LESSON"
        });
    }

    const todayActivities = enrichedActivities.filter((a) => a.isToday);
    const nextActivity = todayActivities.find((a) => !a.isCompleted) ||
        enrichedActivities.find((a) => a.temporalStatus === "UPCOMING" && !a.isCompleted) ||
        enrichedActivities.find((a) => !a.isCompleted) || null;

    const weekDays = calendarDays.map((day) => {
        const activities = enrichedActivities.filter((a) => a.scheduledDate === day.date);
        const completed = activities.filter((a) => a.isCompleted).length;
        const pending = activities.length - completed;
        const dayState = day.date < todayDate ? "PAST" : day.date === todayDate ? "TODAY" : "UPCOMING";
        return {
            ...day,
            dayState,
            isToday: dayState === "TODAY",
            activities,
            activityCount: activities.length,
            completedCount: completed,
            pendingCount: pending,
            totalDurationMinutes: activities.reduce((sum, activity) => sum + (activity.estimatedDurationMinutes || 0), 0),
            isRestDay: activities.length === 0
        };
    });

    return {
        ...plan,
        scheduledActivities: enrichedActivities,
        weekDays,
        todayDate,
        summary: {
            totalScheduled: enrichedActivities.length,
            completedCount,
            pendingCount,
            missedCount: overdueCount,
            overdueCount,
            progressPercentage: enrichedActivities.length > 0
                ? Math.round((completedCount / enrichedActivities.length) * 100)
                : 0
        },
        todayActivities,
        nextActivity,
        topicInsights: allMastery.map((mastery) => ({
            topicId: String(mastery.topicId),
            courseId: String(mastery.courseId),
            masteryScore: typeof mastery.masteryScore === "number" ? mastery.masteryScore : null,
            status: mastery.status || "INSUFFICIENT_EVIDENCE",
            confidence: typeof mastery.confidence === "number" ? mastery.confidence : null,
            evidenceCount: mastery.evidenceCount ?? null
        }))
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

    const currentActivePre = await StudyPlan.findOne({ learnerId, status: "ACTIVE" }).sort({ version: -1 }).lean();
    if (currentActivePre) {
        if (currentActivePre.version !== existingProposal.basedOnVersion ||
            (existingProposal.basedOnPlanId && currentActivePre._id.toString() !== existingProposal.basedOnPlanId.toString())) {
            existingProposal.status = "EXPIRED";
            await existingProposal.save();
            throw new ApiError(409, "PROPOSAL_STALE", "Active study plan has evolved since this proposal was created");
        }
    } else if (existingProposal.basedOnPlanId != null) {
        existingProposal.status = "EXPIRED";
        await existingProposal.save();
        throw new ApiError(409, "PROPOSAL_STALE", "Proposal references an active plan that no longer exists");
    }

    // Authoritative Server-Side Revalidation of each activity before transaction
    const revalidatedActivities = await revalidateActivities(learnerId, existingProposal.proposedActivities);
    const weekInfo = getWeekDates();
    const preferences = await getLearnerStudyPreferences(learnerId);

    // Atomically accept proposal, supersede previous active plan, and insert new active plan
    const newActivePlan = await withTransaction(async (session) => {
        // Fetch and lock/verify current active plan within the transaction
        const existingActive = await StudyPlan.findOne({ learnerId, status: "ACTIVE" })
            .sort({ version: -1 })
            .session(session);

        // Strict invariant check inside the transaction: verify current active plan matches proposal's basedOnPlanId and basedOnVersion
        if (existingActive) {
            if (existingActive.version !== existingProposal.basedOnVersion) {
                throw new ApiError(409, "PROPOSAL_STALE", "Active study plan version has evolved since this proposal was created");
            }
            if (!existingProposal.basedOnPlanId || existingActive._id.toString() !== existingProposal.basedOnPlanId.toString()) {
                throw new ApiError(409, "PROPOSAL_STALE", "Active study plan instance has changed since this proposal was created");
            }
        } else if (existingProposal.basedOnPlanId != null) {
            throw new ApiError(409, "PROPOSAL_STALE", "Active study plan referenced by this proposal was removed or superseded");
        }

        // Atomic conditional status update on proposal inside transaction: exactly one concurrent call can succeed
        const updatedProposal = await StudyPlanProposal.findOneAndUpdate(
            {
                _id: proposalId,
                learnerId,
                status: "PENDING",
                expiresAt: { $gt: new Date() },
                basedOnVersion: existingActive ? existingActive.version : existingProposal.basedOnVersion
            },
            { $set: { status: "ACCEPTED" } },
            { session, new: true }
        );

        if (!updatedProposal) {
            throw new ApiError(409, "PROPOSAL_STALE", "Revision proposal could not be accepted due to concurrent resolution or status change");
        }

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
