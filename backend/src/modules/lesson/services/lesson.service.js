import mongoose from "mongoose";
import { Lesson } from "../models/lesson.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { assertTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

async function getOwnedTopicAndCourse(instructorId, topicId) {
    const topic = await Topic.findById(topicId);
    if (!topic) throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");

    const course = await Course.findById(topic.courseId);
    if (!course) throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");

    if (course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }
    return { topic, course };
}

async function getOwnedLessonContext(instructorId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const topic = await Topic.findById(lesson.topicId);
    if (!topic) throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const course = await Course.findById(topic.courseId);
    if (!course || course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    return { lesson, topic, course };
}

function assertCourseMutable(course) {
    if (course.status === "ARCHIVED") {
        throw new ApiError(409, "COURSE_ARCHIVED", "Lessons cannot be modified in an archived course");
    }
}

const createLessonService = async (instructorId, topicId, lessonData) => {
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);
    assertCourseMutable(course);

    const lastLesson = await Lesson.findOne({ topicId }).sort({ order: -1 }).select("order");
    return Lesson.create({
        topicId,
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        order: lastLesson ? lastLesson.order + 1 : 1,
        status: "ACTIVE"
    });
};

const getLessonsByTopicService = async (userId, topicId, userRole = "INSTRUCTOR") => {
    const topic = await Topic.findById(topicId);
    if (!topic) throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");

    const course = await Course.findById(topic.courseId);
    if (!course) throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");

    let filter = { topicId };

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        // Instructors can see archived lessons so they can restore them.
    } else if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED") {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        const enrollment = await Enrollment.findOne({
            learnerId: userId, courseId: course._id, status: "ACTIVE"
        });
        if (!enrollment) {
            throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "Active course enrollment is required to access lessons");
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
        filter.status = "ACTIVE";
    } else if (userRole === "ADMIN") {
        // Administrators retain visibility for support and moderation.
    } else {
        throw new ApiError(403, "FORBIDDEN", "Access denied");
    }

    return Lesson.find(filter).sort({ order: 1 });
};

const getLessonByIdService = async (userId, lessonId, userRole = "INSTRUCTOR") => {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const topic = await Topic.findById(lesson.topicId);
    if (!topic) throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const course = await Course.findById(topic.courseId);
    if (!course) throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
        }
    } else if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED" || lesson.status !== "ACTIVE") {
            throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
        }
        const enrollment = await Enrollment.findOne({
            learnerId: userId, courseId: course._id, status: "ACTIVE"
        });
        if (!enrollment) {
            throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "Active course enrollment is required to access lessons");
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
    } else if (userRole !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Access denied");
    }
    return lesson;
};

const updateLessonService = async (instructorId, lessonId, updateData) => {
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);
    assertCourseMutable(course);

    if (lesson.status !== "ACTIVE") {
        throw new ApiError(409, "LESSON_ARCHIVED", "Restore this lesson before editing it");
    }
    if (updateData.title !== undefined) lesson.title = updateData.title;
    if (updateData.description !== undefined) lesson.description = updateData.description;
    if (updateData.content !== undefined) lesson.content = updateData.content;

    await lesson.save();
    return lesson;
};

const archiveLessonService = async (instructorId, lessonId) => {
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);
    assertCourseMutable(course);

    if (lesson.status === "ARCHIVED") return lesson;
    lesson.status = "ARCHIVED";
    await lesson.save();
    return lesson;
};

const restoreLessonService = async (instructorId, lessonId) => {
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);
    assertCourseMutable(course);

    if (lesson.status === "ACTIVE") return lesson;

    // Keep the compound unique (topicId, order) index collision-free.
    // Restored lessons re-enter at the end of the active sequence.
    const lastLesson = await Lesson.findOne({
        topicId: lesson.topicId,
        status: "ACTIVE"
    }).sort({ order: -1 }).select("order");

    const maxStored = await Lesson.findOne({ topicId: lesson.topicId })
        .sort({ order: -1 }).select("order");

    lesson.order = Math.max(lastLesson?.order || 0, maxStored?.order || 0) + 1;
    lesson.status = "ACTIVE";
    await lesson.save();
    return lesson;
};

// Hard deletion remains available only for draft-course cleanup.
// Published-course content must use archive/restore to preserve references.
const deleteLessonService = async (instructorId, lessonId) => {
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);
    if (course.status === "PUBLISHED") {
        throw new ApiError(409, "LESSON_DELETION_NOT_ALLOWED", "Published-course lessons must be archived, not deleted");
    }
    if (course.status === "ARCHIVED") {
        throw new ApiError(409, "COURSE_ARCHIVED", "Lessons cannot be modified in an archived course");
    }

    const topicId = lesson.topicId;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Lesson.deleteOne({ _id: lesson._id }, { session });
            const remaining = await Lesson.find({ topicId }).sort({ order: 1 }).session(session);
            for (let i = 0; i < remaining.length; i += 1) {
                const expected = i + 1;
                if (remaining[i].order !== expected) {
                    await Lesson.updateOne(
                        { _id: remaining[i]._id },
                        { $set: { order: expected } },
                        { session }
                    );
                }
            }
        });
    } finally {
        await session.endSession();
    }
    return lesson;
};

const reorderLessonsService = async (instructorId, topicId, lessonIds) => {
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);
    if (course.status === "PUBLISHED") {
        throw new ApiError(409, "LESSON_REORDER_NOT_ALLOWED", "Lessons cannot be reordered in a published course");
    }
    if (course.status === "ARCHIVED") {
        throw new ApiError(409, "COURSE_ARCHIVED", "Lessons cannot be modified in an archived course");
    }

    const existingLessons = await Lesson.find({ topicId, status: "ACTIVE" });
    const existingIds = new Set(existingLessons.map(x => x._id.toString()));
    const requestedIds = new Set(lessonIds.map(x => x.toString()));
    const exact = lessonIds.length === existingLessons.length &&
        requestedIds.size === lessonIds.length &&
        [...requestedIds].every(id => existingIds.has(id));

    if (!exact) {
        throw new ApiError(400, "INVALID_LESSON_ORDER", "Lesson IDs must exactly match the active lessons in this topic");
    }

    // Draft reordering uses temporary values above every stored order.
    const maxOrder = await Lesson.findOne({ topicId }).sort({ order: -1 }).select("order");
    const offset = (maxOrder?.order || 0) + lessonIds.length + 1;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Lesson.bulkWrite(lessonIds.map((id, i) => ({
                updateOne: {
                    filter: { _id: id, topicId, status: "ACTIVE" },
                    update: { $set: { order: offset + i } }
                }
            })), { session });

            // Archived records retain their order, so active lessons are placed
            // after the highest archived order to preserve the unique index.
            const archivedMax = await Lesson.findOne({ topicId, status: "ARCHIVED" })
                .sort({ order: -1 }).select("order").session(session);
            const start = (archivedMax?.order || 0) + 1;
            await Lesson.bulkWrite(lessonIds.map((id, i) => ({
                updateOne: {
                    filter: { _id: id, topicId, status: "ACTIVE" },
                    update: { $set: { order: start + i } }
                }
            })), { session });
        });
    } finally {
        await session.endSession();
    }
    return Lesson.find({ topicId, status: "ACTIVE" }).sort({ order: 1 });
};

export {
    createLessonService,
    getLessonByIdService,
    getLessonsByTopicService,
    updateLessonService,
    reorderLessonsService,
    deleteLessonService,
    archiveLessonService,
    restoreLessonService
};
