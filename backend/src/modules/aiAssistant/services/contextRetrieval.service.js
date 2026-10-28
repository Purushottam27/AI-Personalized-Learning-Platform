import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { AI_CONSTANTS, AI_ERROR_CODES } from "../constants/aiAssistant.constants.js";

/**
 * Safely extracts textual information from lesson content blocks.
 * Ignores binary data and formats structured blocks into readable text.
 * @param {Array} contentBlocks
 * @returns {string}
 */
export function extractLessonText(contentBlocks) {
    if (!Array.isArray(contentBlocks)) return "";
    const textPieces = [];

    for (const block of contentBlocks) {
        if (!block) continue;
        if (typeof block === "string") {
            const clean = block.trim();
            if (clean) textPieces.push(clean);
        } else if (typeof block === "object") {
            if (typeof block.content === "string") {
                const clean = block.content.trim();
                if (clean) {
                    if (block.type === "HEADING") {
                        textPieces.push(`### ${clean}`);
                    } else if (block.type === "CALLOUT") {
                        textPieces.push(`[${block.variant || "NOTE"}]: ${clean}`);
                    } else if (block.type === "CODE") {
                        textPieces.push(`\`\`\`${block.language || ""}\n${clean}\n\`\`\``);
                    } else {
                        textPieces.push(clean);
                    }
                }
            } else if (Array.isArray(block.items)) {
                const listItems = block.items
                    .filter((item) => typeof item === "string" && item.trim().length > 0)
                    .map((item) => `- ${item.trim()}`)
                    .join("\n");
                if (listItems) textPieces.push(listItems);
            } else if (typeof block.title === "string") {
                const clean = block.title.trim();
                if (clean) textPieces.push(clean);
            }
        }
    }

    return textPieces.join("\n\n");
}

/**
 * Truncates text safely to max characters without cutting mid-word where possible.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
export function truncateContext(text, maxChars = AI_CONSTANTS.MAX_CONTEXT_CHARACTERS) {
    if (!text || text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "\n...[Context truncated for brevity]";
}

/**
 * Context Retrieval Service.
 * Retrieves authorized course, topic, and lesson context for a learner.
 *
 * Enforces:
 * 1. Valid ObjectIds.
 * 2. Course must be PUBLISHED.
 * 3. Learner must have an ACTIVE enrollment.
 * 4. Assessment questions, question pools, and answer keys are NEVER queried or leaked.
 * 5. Bounded context size.
 */
export async function retrieveAuthorizedContext({ learnerId, courseId = null, topicId = null, lessonId = null }) {
    // If no context parameters provided, return empty context (general question)
    if (!courseId && !topicId && !lessonId) {
        return {
            contextText: null,
            usedCourseContext: false,
            sources: [],
        };
    }

    let targetCourse = null;
    let targetTopic = null;
    let targetLesson = null;
    const sources = [];
    const contextSections = [];

    // Case 1: lessonId specified
    if (lessonId) {
        targetLesson = await Lesson.findById(lessonId).lean();
        if (!targetLesson) {
            throw new ApiError(404, "LESSON_NOT_FOUND", "Specified lesson was not found");
        }

        targetTopic = await Topic.findById(targetLesson.topicId).lean();
        if (!targetTopic) {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic for this lesson was not found");
        }

        if (topicId && topicId.toString() !== targetLesson.topicId.toString()) {
            throw new ApiError(400, "INVALID_CONTEXT_REFERENCE", "Lesson does not belong to the specified topic");
        }

        targetCourse = await Course.findById(targetTopic.courseId).lean();
        if (!targetCourse) {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Course for this topic was not found");
        }

        if (courseId && courseId.toString() !== targetTopic.courseId.toString()) {
            throw new ApiError(400, "INVALID_CONTEXT_REFERENCE", "Topic does not belong to the specified course");
        }
    }
    // Case 2: topicId specified (no lessonId)
    else if (topicId) {
        targetTopic = await Topic.findById(topicId).lean();
        if (!targetTopic) {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Specified topic was not found");
        }

        targetCourse = await Course.findById(targetTopic.courseId).lean();
        if (!targetCourse) {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Course for this topic was not found");
        }

        if (courseId && courseId.toString() !== targetTopic.courseId.toString()) {
            throw new ApiError(400, "INVALID_CONTEXT_REFERENCE", "Topic does not belong to the specified course");
        }
    }
    // Case 3: courseId specified only
    else if (courseId) {
        targetCourse = await Course.findById(courseId).lean();
        if (!targetCourse) {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Specified course was not found");
        }
    }

    // Verify course is published
    if (targetCourse.status !== "PUBLISHED") {
        throw new ApiError(
            403,
            AI_ERROR_CODES.COURSE_NOT_AVAILABLE,
            "Course material is not available because the course is not published"
        );
    }

    // Verify learner has ACTIVE enrollment
    const activeEnrollment = await Enrollment.findOne({
        learnerId,
        courseId: targetCourse._id,
        status: "ACTIVE",
    }).lean();

    if (!activeEnrollment) {
        throw new ApiError(
            403,
            AI_ERROR_CODES.ENROLLMENT_REQUIRED,
            "Active enrollment is required to access course learning materials"
        );
    }

    // Add Course to sources & context
    sources.push({
        type: "course",
        id: targetCourse._id.toString(),
        title: targetCourse.title,
    });

    contextSections.push(
        `Course Title: ${targetCourse.title}\nDescription: ${targetCourse.description || "N/A"}\nObjectives: ${
            Array.isArray(targetCourse.objectives) && targetCourse.objectives.length > 0
                ? targetCourse.objectives.join("; ")
                : "N/A"
        }`
    );

    // If specific lesson is requested
    if (targetLesson) {
        sources.push({
            type: "topic",
            id: targetTopic._id.toString(),
            title: targetTopic.title,
        });
        sources.push({
            type: "lesson",
            id: targetLesson._id.toString(),
            title: targetLesson.title,
        });

        contextSections.push(
            `Topic: ${targetTopic.title}\nLearning Objectives: ${
                Array.isArray(targetTopic.learningObjectives) ? targetTopic.learningObjectives.join("; ") : "N/A"
            }`
        );

        const lessonText = extractLessonText(targetLesson.content);
        contextSections.push(
            `Lesson Title: ${targetLesson.title}\nLesson Description: ${targetLesson.description || ""}\nLesson Content:\n${
                lessonText || "(No detailed text in lesson)"
            }`
        );
    }
    // If specific topic is requested
    else if (targetTopic) {
        sources.push({
            type: "topic",
            id: targetTopic._id.toString(),
            title: targetTopic.title,
        });

        contextSections.push(
            `Topic Title: ${targetTopic.title}\nTopic Description: ${targetTopic.description || ""}\nLearning Objectives: ${
                Array.isArray(targetTopic.learningObjectives) ? targetTopic.learningObjectives.join("; ") : "N/A"
            }`
        );

        // Fetch lessons belonging to this topic (up to 5 lessons to respect context bound)
        const lessons = await Lesson.find({ topicId: targetTopic._id })
            .sort({ order: 1 })
            .limit(5)
            .lean();

        for (const lesson of lessons) {
            sources.push({
                type: "lesson",
                id: lesson._id.toString(),
                title: lesson.title,
            });
            const text = extractLessonText(lesson.content);
            contextSections.push(`Lesson "${lesson.title}": ${lesson.description || ""}\n${text}`);
        }
    }
    // If course outline only is requested
    else {
        const topics = await Topic.find({ courseId: targetCourse._id })
            .sort({ order: 1 })
            .limit(10)
            .lean();

        for (const topic of topics) {
            sources.push({
                type: "topic",
                id: topic._id.toString(),
                title: topic.title,
            });
            contextSections.push(
                `- Topic ${topic.order}: ${topic.title} (${
                    Array.isArray(topic.learningObjectives) ? topic.learningObjectives.join(", ") : ""
                })`
            );
        }
    }

    const fullContext = contextSections.join("\n\n---\n\n");
    const boundedContext = truncateContext(fullContext, AI_CONSTANTS.MAX_CONTEXT_CHARACTERS);

    return {
        contextText: boundedContext,
        usedCourseContext: true,
        sources,
    };
}
