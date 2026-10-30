import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { isTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { Practice } from "../../practice/models/practice.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { evaluatePrerequisites } from "../../enrollment/services/enrollment.service.js";
import { LearnerProfile } from "../../learner/models/learnerProfile.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import {
    RECOMMENDATION_ACTION_TYPES,
    RECOMMENDATION_TARGET_TYPES,
    RECOMMENDATION_REASON_CODES,
    RECOMMENDATION_TIERS,
} from "../constants/recommendation.constants.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function fail(status, code, message, details = null) {
    throw new ApiError(status, code, message, details);
}

function requireObjectId(value, field) {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        fail(400, "INVALID_ID", `${field} is invalid`);
    }
}

/**
 * Discovers published courses matching a learner's onboarding profile (interests, goals, level).
 * Excludes courses the learner is already enrolled in.
 */
export async function findCourseDiscoveryRecommendations(learnerId, excludedCourseIds = [], limit = 10) {
    const profile = await LearnerProfile.findOne({ userId: learnerId }).lean();
    if (!profile) return [];

    const interests = Array.isArray(profile.interests)
        ? profile.interests.map((s) => String(s).trim()).filter(Boolean)
        : [];
    const goals = Array.isArray(profile.goals)
        ? profile.goals.map((s) => String(s).trim()).filter(Boolean)
        : [];

    if (interests.length === 0 && goals.length === 0) return [];

    const query = { status: "PUBLISHED" };
    if (excludedCourseIds && excludedCourseIds.length > 0) {
        query._id = { $nin: excludedCourseIds };
    }

    const publishedCourses = await Course.find(query).lean();
    if (publishedCourses.length === 0) return [];

    const scoredCourses = [];

    for (const course of publishedCourses) {
        const textPool = [
            course.title || "",
            course.description || "",
            course.domain || "",
            course.category || "",
            ...(Array.isArray(course.objectives) ? course.objectives : []),
        ].join(" ").toLowerCase();

        let matchScore = 0;
        const matchedTerms = [];

        for (const interest of interests) {
            const lower = interest.toLowerCase();
            if (textPool.includes(lower)) {
                matchScore += 10;
                matchedTerms.push(interest);
            }
        }

        for (const goal of goals) {
            const lower = goal.toLowerCase();
            if (textPool.includes(lower)) {
                matchScore += 5;
                if (!matchedTerms.includes(goal)) {
                    matchedTerms.push(goal);
                }
            }
        }

        if (profile.experienceLevel) {
            const exp = profile.experienceLevel;
            if (
                (exp === "I have no prior knowledge" || exp === "I have a basic understanding") &&
                course.difficulty === "BEGINNER"
            ) {
                matchScore += 2;
            } else if (
                exp === "I have substantial experience" &&
                course.difficulty === "ADVANCED"
            ) {
                matchScore += 2;
            }
        }

        if (matchScore > 0) {
            scoredCourses.push({
                course,
                matchScore,
                matchedTerms,
            });
        }
    }

    scoredCourses.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (a.course.title || "").localeCompare(b.course.title || "");
    });

    const topScored = scoredCourses.slice(0, limit);

    // Collect all prerequisite course IDs referenced by top scored courses
    const allPrereqCourseIds = new Set();
    for (const item of topScored) {
        const prereqList = item.course.prerequisites?.courses || [];
        for (const pId of prereqList) {
            if (pId) allPrereqCourseIds.add(pId.toString());
        }
    }

    // Resolve prerequisite course metadata for published prerequisite courses
    const prereqDocs = allPrereqCourseIds.size > 0
        ? await Course.find({ _id: { $in: Array.from(allPrereqCourseIds) } }).select("_id title status domain difficulty").lean()
        : [];
    const prereqDocMap = new Map(prereqDocs.map((doc) => [doc._id.toString(), doc]));

    // Evaluate prerequisites for each recommended discovery course using existing evaluatePrerequisites
    const discoveryItems = [];
    for (let index = 0; index < topScored.length; index++) {
        const item = topScored[index];
        const c = item.course;
        const topTerm = item.matchedTerms[0] || null;
        let reason = topTerm
            ? `Matches your interest in "${topTerm}"`
            : "Recommended based on your learning goals and profile";

        const prereqCourseIds = c.prerequisites?.courses || [];
        const prereqEvaluation = await evaluatePrerequisites(learnerId, prereqCourseIds);

        // Identify unmet prerequisites and whether any are published/enrollable
        const unmetPrereqTitles = [];
        const unmetPrereqDetails = [];
        for (const unmetId of prereqEvaluation.unmetCourseIds) {
            const pDoc = prereqDocMap.get(unmetId);
            if (pDoc) {
                unmetPrereqTitles.push(pDoc.title);
                unmetPrereqDetails.push({
                    courseId: pDoc._id,
                    title: pDoc.title,
                    status: pDoc.status,
                    domain: pDoc.domain,
                    difficulty: pDoc.difficulty,
                    isPublished: pDoc.status === "PUBLISHED",
                });
            } else {
                unmetPrereqTitles.push("Prerequisite Course");
                unmetPrereqDetails.push({
                    courseId: unmetId,
                    title: "Prerequisite Course",
                    status: "UNKNOWN",
                    isPublished: false,
                });
            }
        }

        let explanation = reason;
        if (!prereqEvaluation.isSatisfied && unmetPrereqTitles.length > 0) {
            explanation = `${reason}. Note: Requires completion of prerequisite course(s): ${unmetPrereqTitles.join(", ")}.`;
        }

        discoveryItems.push({
            id: `rec_course_${c._id}`,
            actionType: "EXPLORE_COURSE",
            courseId: c._id,
            courseTitle: c.title,
            title: `Explore Course: ${c.title}`,
            description: c.description,
            domain: c.domain,
            category: c.category,
            difficulty: c.difficulty,
            targetId: c._id,
            targetType: "COURSE",
            priority: index + 1,
            matchedInterest: topTerm,
            reason,
            explanation,
            isActionable: true,
            prerequisitesSatisfied: prereqEvaluation.isSatisfied,
            unmetPrerequisites: unmetPrereqDetails,
        });
    }

    return discoveryItems;
}

/**
 * Helper to determine the top next best action when course discovery is active
 * and there are no higher-priority active-course candidates.
 * Prioritizes required published prerequisite courses over regular course exploration.
 */
function resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations = []) {
    if (!courseDiscoveryRecommendations || courseDiscoveryRecommendations.length === 0) {
        return null;
    }

    // Check if any discovery recommendation has unmet prerequisites that are published courses
    for (const rec of courseDiscoveryRecommendations) {
        if (!rec.prerequisitesSatisfied && Array.isArray(rec.unmetPrerequisites)) {
            const firstPublishedPrereq = rec.unmetPrerequisites.find((p) => p.isPublished);
            if (firstPublishedPrereq) {
                return {
                    type: "EXPLORE_COURSE",
                    title: `Complete Prerequisite: ${firstPublishedPrereq.title}`,
                    description: `Course "${rec.courseTitle}" requires "${firstPublishedPrereq.title}" as a prerequisite before you can enroll. Start this prerequisite course first.`,
                    actionType: "EXPLORE_COURSE",
                    courseId: firstPublishedPrereq.courseId,
                    targetId: firstPublishedPrereq.courseId,
                    targetType: "COURSE",
                    priority: 1,
                    reasonCode: "PREREQUISITE_COURSE_REQUIRED",
                    explanation: `Prerequisite for "${rec.courseTitle}". Completing this course satisfies prerequisite requirements for enrollment.`,
                    isActionable: true,
                };
            }
        }
    }

    const topCourse = courseDiscoveryRecommendations[0];
    return {
        type: "EXPLORE_COURSE",
        title: topCourse.title,
        description: topCourse.description,
        actionType: "EXPLORE_COURSE",
        courseId: topCourse.courseId,
        targetId: topCourse.targetId,
        targetType: "COURSE",
        priority: 1,
        reasonCode: "INTEREST_DISCOVERY",
        explanation: topCourse.reason,
        isActionable: true,
    };
}

/**
 * Compare two candidate recommendations deterministically.
 */
function compareRecommendations(a, b) {
    // 1. Tier priority descending (100 > 80 > 60 > 40 > 20)
    if (b.tierPriority !== a.tierPriority) {
        return b.tierPriority - a.tierPriority;
    }

    // 2. Intra-tier priority
    // For weaknesses & developing topics: lower mastery score is more urgent
    if (a.tierKey === "DEMONSTRATED_WEAKNESS" || a.tierKey === "DEVELOPING_MASTERY") {
        const scoreA = typeof a.masteryScore === "number" ? a.masteryScore : Infinity;
        const scoreB = typeof b.masteryScore === "number" ? b.masteryScore : Infinity;
        if (scoreA !== scoreB) {
            return scoreA - scoreB;
        }
    }

    // For insufficient evidence & progression: lower topic order comes first (curriculum order)
    if (a.topicOrder !== b.topicOrder) {
        return a.topicOrder - b.topicOrder;
    }

    // 3. Deterministic tie-breakers
    const courseCmp = a.courseId.toString().localeCompare(b.courseId.toString());
    if (courseCmp !== 0) return courseCmp;

    const topicCmp = a.topicId.toString().localeCompare(b.topicId.toString());
    if (topicCmp !== 0) return topicCmp;

    const actionCmp = a.actionType.localeCompare(b.actionType);
    if (actionCmp !== 0) return actionCmp;

    return a.targetId.toString().localeCompare(b.targetId.toString());
}

/**
 * Generates personalized recommendations for an authenticated learner.
 * Supports course-scoped queries or general queries across all actively enrolled courses.
 */
export async function getLearnerRecommendationsService(learnerId, options = {}) {
    requireObjectId(learnerId, "learnerId");

    const limit = options.limit ? Math.min(Math.max(options.limit, 1), 50) : 10;
    let coursesToInspect = [];
    let courseDiscoveryRecommendations = [];

    if (options.courseId) {
        requireObjectId(options.courseId, "courseId");
        const course = await Course.findById(options.courseId).lean();
        if (!course || course.status !== "PUBLISHED") {
            fail(404, "COURSE_NOT_AVAILABLE", "Course is not available");
        }

        const enrollment = await Enrollment.findOne({
            learnerId,
            courseId: options.courseId,
            status: "ACTIVE",
        }).lean();
        if (!enrollment) {
            fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view course recommendations");
        }

        coursesToInspect = [course];
    } else {
        const activeEnrollments = await Enrollment.find({
            learnerId,
            status: "ACTIVE",
        }).select("courseId").lean();

        const activeCourseIds = activeEnrollments.map((e) => e.courseId);

        // Fetch course discovery recommendations for unenrolled published courses
        courseDiscoveryRecommendations = await findCourseDiscoveryRecommendations(
            learnerId,
            activeCourseIds,
            limit
        );

        if (activeEnrollments.length === 0) {
            if (courseDiscoveryRecommendations.length === 0) {
                return {
                    nextBestAction: null,
                    recommendations: [],
                    courseRecommendations: [],
                    totalCount: 0,
                };
            }

            return {
                nextBestAction: resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations),
                recommendations: [],
                courseRecommendations: courseDiscoveryRecommendations,
                totalCount: courseDiscoveryRecommendations.length,
            };
        }

        coursesToInspect = await Course.find({
            _id: { $in: activeCourseIds },
            status: "PUBLISHED",
        }).lean();

        if (coursesToInspect.length === 0) {
            if (courseDiscoveryRecommendations.length === 0) {
                return {
                    nextBestAction: null,
                    recommendations: [],
                    courseRecommendations: [],
                    totalCount: 0,
                };
            }

            return {
                nextBestAction: resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations),
                recommendations: [],
                courseRecommendations: courseDiscoveryRecommendations,
                totalCount: courseDiscoveryRecommendations.length,
            };
        }
    }

    const courseIds = coursesToInspect.map((c) => c._id);

    // Fetch all topics for inspected courses
    const topics = await Topic.find({
        courseId: { $in: courseIds },
    }).sort({ courseId: 1, order: 1 }).lean();

    if (topics.length === 0) {
        if (courseDiscoveryRecommendations.length > 0) {
            return {
                nextBestAction: resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations),
                recommendations: [],
                courseRecommendations: courseDiscoveryRecommendations,
                totalCount: courseDiscoveryRecommendations.length,
            };
        }
        return {
            nextBestAction: null,
            recommendations: [],
            courseRecommendations: [],
            totalCount: 0,
        };
    }

    const topicIds = topics.map((t) => t._id);

    // Fetch existing TopicMastery records for this learner and courses
    const masteryRecords = await TopicMastery.find({
        learnerId,
        courseId: { $in: courseIds },
    }).lean();
    const masteryMap = new Map(masteryRecords.map((m) => [`${m.courseId}_${m.topicId}`, m]));

    // Fetch published lessons for these topics
    const lessons = await Lesson.find({
        topicId: { $in: topicIds },
    }).sort({ topicId: 1, order: 1 }).lean();
    const lessonsByTopic = new Map();
    for (const lesson of lessons) {
        const key = lesson.topicId.toString();
        if (!lessonsByTopic.has(key)) {
            lessonsByTopic.set(key, []);
        }
        lessonsByTopic.get(key).push(lesson);
    }

    // Fetch published practices for these topics
    const practices = await Practice.find({
        topicId: { $in: topicIds },
        status: "PUBLISHED",
    }).sort({ topicId: 1, createdAt: -1 }).lean();
    const practicesByTopic = new Map();
    for (const practice of practices) {
        const key = practice.topicId.toString();
        if (!practicesByTopic.has(key)) {
            practicesByTopic.set(key, []);
        }
        practicesByTopic.get(key).push(practice);
    }

    // Group topics by course to enable progression checks
    const topicsByCourse = new Map();
    for (const topic of topics) {
        const cKey = topic.courseId.toString();
        if (!topicsByCourse.has(cKey)) {
            topicsByCourse.set(cKey, []);
        }
        topicsByCourse.get(cKey).push(topic);
    }

    const courseMap = new Map(coursesToInspect.map((c) => [c._id.toString(), c]));
    const candidates = [];

    // Evaluate rules for each topic
    for (const topic of topics) {
        const course = courseMap.get(topic.courseId.toString());
        const unlockStatus = await isTopicUnlockedForLearner(learnerId, course, topic);
        const isTopicUnlocked = Boolean(unlockStatus?.isUnlocked);
        const masteryKey = `${topic.courseId}_${topic._id}`;
        const mastery = masteryMap.get(masteryKey) || {
            masteryScore: null,
            status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: 0,
            evidenceCount: 0,
        };

        const topicLessons = lessonsByTopic.get(topic._id.toString()) || [];
        const topicPractices = practicesByTopic.get(topic._id.toString()) || [];
        const firstLesson = topicLessons[0] || null;
        const availablePractice = topicPractices[0] || null;

        const courseTopics = topicsByCourse.get(topic.courseId.toString()) || [];
        const nextTopic = courseTopics.find((t) => t.order > topic.order) || null;

        let candidate = null;

        switch (mastery.status) {
            case MASTERY_STATUS.NEEDS_IMPROVEMENT: {
                const tier = RECOMMENDATION_TIERS.DEMONSTRATED_WEAKNESS;
                if (availablePractice) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                        title: `Practice: ${availablePractice.title}`,
                        description: `Your mastery in "${topic.title}" is currently weak (${mastery.masteryScore}%). Practice these targeted questions to improve.`,
                        targetId: availablePractice._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.WEAKNESS_PRACTICE,
                        explanation: `Topic mastery status is NEEDS_IMPROVEMENT (score: ${mastery.masteryScore}%). Targeted practice is recommended to address conceptual weaknesses.`,
                        isActionable: true,
                    };
                } else if (firstLesson) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_LESSON,
                        title: `Review Lesson: ${firstLesson.title}`,
                        description: `Review foundational lesson "${firstLesson.title}" in topic "${topic.title}" to address identified weaknesses.`,
                        targetId: firstLesson._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.LESSON,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.WEAKNESS_REVISION,
                        explanation: `Topic mastery status is NEEDS_IMPROVEMENT (score: ${mastery.masteryScore}%). Reviewing the lesson will help reinforce core concepts.`,
                        isActionable: true,
                    };
                } else {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_TOPIC,
                        title: `Review Topic: ${topic.title}`,
                        description: `Focus on topic "${topic.title}" to overcome demonstrated weaknesses.`,
                        targetId: topic._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.WEAKNESS_REVISION,
                        explanation: `Topic mastery status is NEEDS_IMPROVEMENT (score: ${mastery.masteryScore}%). No specific published practice or lesson is currently available.`,
                        isActionable: false,
                    };
                }
                break;
            }

            case MASTERY_STATUS.DEVELOPING: {
                const tier = RECOMMENDATION_TIERS.DEVELOPING_MASTERY;
                if (availablePractice) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                        title: `Practice: ${availablePractice.title}`,
                        description: `Your understanding of "${topic.title}" is developing (${mastery.masteryScore}%). Complete this practice to build confidence.`,
                        targetId: availablePractice._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.DEVELOPING_PRACTICE,
                        explanation: `Topic mastery is DEVELOPING (score: ${mastery.masteryScore}%). Targeted practice helps solidify understanding.`,
                        isActionable: true,
                    };
                } else if (firstLesson) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_LESSON,
                        title: `Study Lesson: ${firstLesson.title}`,
                        description: `Reinforce your developing knowledge with lesson "${firstLesson.title}".`,
                        targetId: firstLesson._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.LESSON,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.DEVELOPING_LESSON,
                        explanation: `Topic mastery is DEVELOPING (score: ${mastery.masteryScore}%). Lesson review will strengthen comprehension.`,
                        isActionable: true,
                    };
                } else {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_TOPIC,
                        title: `Review Topic: ${topic.title}`,
                        description: `Continue working on topic "${topic.title}".`,
                        targetId: topic._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.DEVELOPING_LESSON,
                        explanation: `Topic mastery is DEVELOPING (score: ${mastery.masteryScore}%).`,
                        isActionable: false,
                    };
                }
                break;
            }

            case MASTERY_STATUS.INSUFFICIENT_EVIDENCE: {
                const tier = RECOMMENDATION_TIERS.INSUFFICIENT_EVIDENCE;
                if (firstLesson) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_LESSON,
                        title: `Start Lesson: ${firstLesson.title}`,
                        description: `Begin exploring topic "${topic.title}" with lesson "${firstLesson.title}".`,
                        targetId: firstLesson._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.LESSON,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.INTRODUCTORY_LESSON,
                        explanation: `Insufficient evidence recorded for topic "${topic.title}". Engaging with introductory lessons is recommended to begin learning.`,
                        isActionable: true,
                    };
                } else if (availablePractice) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                        title: `Practice: ${availablePractice.title}`,
                        description: `Take a practice set on "${topic.title}" to establish your learning baseline.`,
                        targetId: availablePractice._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.DIAGNOSTIC_PRACTICE,
                        explanation: `Insufficient evidence recorded for topic "${topic.title}". Attempting practice will provide baseline evidence of understanding.`,
                        isActionable: true,
                    };
                } else {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.REVIEW_TOPIC,
                        title: `Explore Topic: ${topic.title}`,
                        description: `Begin topic "${topic.title}".`,
                        targetId: topic._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.INTRODUCTORY_LESSON,
                        explanation: `Insufficient evidence recorded for topic "${topic.title}". No published lessons or practices are currently available.`,
                        isActionable: false,
                    };
                }
                break;
            }

            case MASTERY_STATUS.FUNCTIONAL:
            case MASTERY_STATUS.STRONG: {
                const tier = RECOMMENDATION_TIERS.MASTERY_PROGRESSION;
                if (nextTopic) {
                    const nextUnlockStatus = await isTopicUnlockedForLearner(learnerId, course, nextTopic);
                    const isNextUnlocked = Boolean(nextUnlockStatus?.isUnlocked);

                    if (isNextUnlocked) {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC,
                            title: `Progress to: ${nextTopic.title}`,
                            description: `You have demonstrated ${mastery.status.toLowerCase()} mastery in "${topic.title}" (${mastery.masteryScore}%). Advance to the next topic "${nextTopic.title}".`,
                            targetId: nextTopic._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.PROGRESSION_NEXT_TOPIC,
                            explanation: `Topic "${topic.title}" has demonstrated solid mastery (${mastery.masteryScore}%). Proceeding to "${nextTopic.title}" is recommended.`,
                            isActionable: true,
                        };
                    } else if (availablePractice) {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                            title: `Reinforce: ${availablePractice.title}`,
                            description: `Reinforce your strong understanding of "${topic.title}" with additional practice while next topic is locked.`,
                            targetId: availablePractice._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.MASTERY_REINFORCEMENT,
                            explanation: `Topic "${topic.title}" is strong (${mastery.masteryScore}%). Next topic "${nextTopic.title}" is currently locked pending prerequisite assessments.`,
                            isActionable: true,
                        };
                    } else {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC,
                            title: `Progress to: ${nextTopic.title}`,
                            description: `You have demonstrated ${mastery.status.toLowerCase()} mastery in "${topic.title}" (${mastery.masteryScore}%). However, "${nextTopic.title}" is locked.`,
                            targetId: nextTopic._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.TOPIC_LOCKED,
                            explanation: `Topic "${nextTopic.title}" is currently locked. Complete all required assessments in previous topics to unlock progression.`,
                            isActionable: false,
                        };
                    }
                } else if (availablePractice) {
                    candidate = {
                        actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                        title: `Reinforce: ${availablePractice.title}`,
                        description: `Reinforce your strong understanding of "${topic.title}" with additional practice.`,
                        targetId: availablePractice._id,
                        targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                        tierKey: tier.key,
                        tierPriority: tier.priority,
                        reasonCode: RECOMMENDATION_REASON_CODES.MASTERY_REINFORCEMENT,
                        explanation: `Topic "${topic.title}" is strong (${mastery.masteryScore}%). Optional practice can maintain mastery.`,
                        isActionable: true,
                    };
                }
                break;
            }

            case MASTERY_STATUS.MASTERED: {
                const tier = RECOMMENDATION_TIERS.MASTERED;
                if (nextTopic) {
                    const nextUnlockStatus = await isTopicUnlockedForLearner(learnerId, course, nextTopic);
                    const isNextUnlocked = Boolean(nextUnlockStatus?.isUnlocked);

                    if (isNextUnlocked) {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC,
                            title: `Progress to: ${nextTopic.title}`,
                            description: `Topic "${topic.title}" is mastered (${mastery.masteryScore}%). Continue your journey with "${nextTopic.title}".`,
                            targetId: nextTopic._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.COURSE_PROGRESSION,
                            explanation: `Topic "${topic.title}" is mastered. Progress to the next topic in the curriculum.`,
                            isActionable: true,
                        };
                    } else if (availablePractice) {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE,
                            title: `Reinforce: ${availablePractice.title}`,
                            description: `Reinforce your mastery in "${topic.title}" with additional practice while next topic is locked.`,
                            targetId: availablePractice._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.PRACTICE,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.MASTERY_REINFORCEMENT,
                            explanation: `Topic "${topic.title}" is mastered (${mastery.masteryScore}%). Next topic "${nextTopic.title}" is currently locked pending prerequisite assessments.`,
                            isActionable: true,
                        };
                    } else {
                        candidate = {
                            actionType: RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC,
                            title: `Progress to: ${nextTopic.title}`,
                            description: `Topic "${topic.title}" is mastered (${mastery.masteryScore}%). However, "${nextTopic.title}" is locked.`,
                            targetId: nextTopic._id,
                            targetType: RECOMMENDATION_TARGET_TYPES.TOPIC,
                            tierKey: tier.key,
                            tierPriority: tier.priority,
                            reasonCode: RECOMMENDATION_REASON_CODES.TOPIC_LOCKED,
                            explanation: `Topic "${nextTopic.title}" is currently locked. Complete all required assessments in previous topics to unlock progression.`,
                            isActionable: false,
                        };
                    }
                }
                break;
            }

            default:
                break;
        }

        if (candidate) {
            // If the current topic itself is locked, its direct actions (lessons/practices) cannot be accessed
            if (!isTopicUnlocked && candidate.actionType !== RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC) {
                candidate.isActionable = false;
                candidate.reasonCode = RECOMMENDATION_REASON_CODES.TOPIC_LOCKED;
                candidate.explanation = `Topic "${topic.title}" is currently locked. Complete all required assessments in previous topics to unlock it.`;
            }

            candidate.courseId = topic.courseId;
            candidate.courseTitle = course?.title || "Unknown Course";
            candidate.topicId = topic._id;
            candidate.topicTitle = topic.title;
            candidate.topicOrder = topic.order;
            candidate.masteryScore = mastery.masteryScore ?? null;
            candidate.masteryStatus = mastery.status;
            candidate.confidence = mastery.confidence;
            candidate.evidenceCount = mastery.evidenceCount;
            candidates.push(candidate);
        }
    }

    if (candidates.length === 0) {
        if (courseDiscoveryRecommendations.length > 0) {
            return {
                nextBestAction: resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations),
                recommendations: [],
                courseRecommendations: courseDiscoveryRecommendations,
                totalCount: courseDiscoveryRecommendations.length,
            };
        }
        return {
            nextBestAction: null,
            recommendations: [],
            courseRecommendations: [],
            totalCount: 0,
        };
    }

    // Deterministically rank all candidates
    candidates.sort(compareRecommendations);

    // Identify Next Best Action:
    // Unified priority:
    // 1. Highest-ranked actionable active-course candidate
    // 2. If no actionable active-course candidates exist: course discovery Next Best Action (prerequisite before plain exploration)
    // 3. Fallback to first active candidate (even if non-actionable) or null
    const topActionableActive = candidates.find((c) => c.isActionable) || null;
    const discoveryNBA = resolveCourseDiscoveryNextBestAction(courseDiscoveryRecommendations);

    let nextBestAction = null;
    if (topActionableActive) {
        nextBestAction = {
            type: topActionableActive.actionType,
            title: topActionableActive.title,
            description: topActionableActive.description,
            actionType: topActionableActive.actionType,
            courseId: topActionableActive.courseId,
            topicId: topActionableActive.topicId,
            targetId: topActionableActive.targetId,
            targetType: topActionableActive.targetType,
            priority: 1,
            score: topActionableActive.masteryScore ?? null,
            status: topActionableActive.masteryStatus,
            reasonCode: topActionableActive.reasonCode,
            explanation: topActionableActive.explanation,
            isActionable: topActionableActive.isActionable,
        };
    } else if (discoveryNBA) {
        nextBestAction = discoveryNBA;
    } else if (candidates.length > 0) {
        const fallback = candidates[0];
        nextBestAction = {
            type: fallback.actionType,
            title: fallback.title,
            description: fallback.description,
            actionType: fallback.actionType,
            courseId: fallback.courseId,
            topicId: fallback.topicId,
            targetId: fallback.targetId,
            targetType: fallback.targetType,
            priority: 1,
            score: fallback.masteryScore ?? null,
            status: fallback.masteryStatus,
            reasonCode: fallback.reasonCode,
            explanation: fallback.explanation,
            isActionable: fallback.isActionable,
        };
    }

    const limitedCandidates = candidates.slice(0, limit);

    const recommendations = limitedCandidates.map((c, index) => ({
        id: `rec_${c.courseId}_${c.topicId}_${c.actionType}`,
        actionType: c.actionType,
        title: c.title,
        description: c.description,
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        topicId: c.topicId,
        topicTitle: c.topicTitle,
        topicOrder: c.topicOrder,
        targetId: c.targetId,
        targetType: c.targetType,
        priority: index + 1,
        tier: c.tierKey,
        masteryScore: c.masteryScore ?? null,
        masteryStatus: c.masteryStatus,
        confidence: c.confidence,
        reasonCode: c.reasonCode,
        explanation: c.explanation,
        isActionable: c.isActionable,
    }));

    return {
        nextBestAction,
        recommendations,
        courseRecommendations: courseDiscoveryRecommendations,
        totalCount: candidates.length + courseDiscoveryRecommendations.length,
    };
}
