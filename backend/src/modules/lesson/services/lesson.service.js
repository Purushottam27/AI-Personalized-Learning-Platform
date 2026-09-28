import mongoose from "mongoose";
import { Lesson } from "../models/lesson.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

async function getOwnedTopicAndCourse(instructorId, topicId) {
    const topic = await Topic.findById(topicId);

    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    return { topic, course };
}

async function getOwnedLessonContext(instructorId, lessonId) {
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    const topic = await Topic.findById(lesson.topicId);

    if (!topic) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course || course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    return { lesson, topic, course };
}

const createLessonService = async(instructorId, topicId, lessonData)=>{
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_ARCHIVED",
            "Lessons cannot be modified in an archived course"
        );
    }

    const lastLesson = await Lesson.findOne({ topicId }).sort({ order: -1 });
    const order = lastLesson ? lastLesson.order + 1 : 1;

    const lesson = await Lesson.create({
        topicId,
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        order
    });

    return lesson;
}

const getLessonsByTopicService = async(instructorId, topicId)=>{
    await getOwnedTopicAndCourse(instructorId, topicId);

    const lessons = await Lesson.find({ topicId }).sort({ order: 1 });

    return lessons;
}

const getLessonByIdService = async(instructorId, lessonId)=>{
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    const topic = await Topic.findById(lesson.topicId);

    if (!topic) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course || course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    return lesson;
}


const updateLessonService = async(instructorId, lessonId, updateData)=>{
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_ARCHIVED",
            "Lessons cannot be modified in an archived course"
        );
    }

    if (updateData.title !== undefined) {
        lesson.title = updateData.title;
    }

    if (updateData.description !== undefined) {
        lesson.description = updateData.description;
    }

    if (updateData.content !== undefined) {
        lesson.content = updateData.content;
    }

    await lesson.save();

    return lesson;
}


const deleteLessonService = async(instructorId, lessonId)=>{
    const { lesson, course } = await getOwnedLessonContext(instructorId, lessonId);

    if (course.status === "PUBLISHED") {
        throw new ApiError(
            409,
            "LESSON_DELETION_NOT_ALLOWED",
            "Lessons cannot be deleted from a published course"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_ARCHIVED",
            "Lessons cannot be modified in an archived course"
        );
    }

    const topicId = lesson.topicId;

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await Lesson.deleteOne({ _id: lesson._id }, { session });

            const remainingLessons = await Lesson.find({ topicId })
                .sort({ order: 1 })
                .session(session);

            // Ascending pass: each target slot (index + 1) is always free,
            // because earlier lessons already occupy 1..index.
            for (let index = 0; index < remainingLessons.length; index++) {
                const expectedOrder = index + 1;

                if (remainingLessons[index].order !== expectedOrder) {
                    await Lesson.updateOne(
                        { _id: remainingLessons[index]._id },
                        { $set: { order: expectedOrder } },
                        { session }
                    );
                }
            }
        });
    } finally {
        await session.endSession();
    }

    return lesson;
}


const reorderLessonsService = async(instructorId, topicId, lessonIds)=>{
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);

    if (course.status === "PUBLISHED") {
        throw new ApiError(
            409,
            "LESSON_REORDER_NOT_ALLOWED",
            "Lessons cannot be reordered in a published course"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_ARCHIVED",
            "Lessons cannot be modified in an archived course"
        );
    }

    const existingLessons = await Lesson.find({ topicId });

    const existingIds = new Set(existingLessons.map((lesson) => lesson._id.toString()));
    const requestedIds = new Set(lessonIds.map((id) => id.toString()));

    const isExactMatch =
        lessonIds.length === existingLessons.length &&
        requestedIds.size === lessonIds.length &&
        [...requestedIds].every((id) => existingIds.has(id));

    if (!isExactMatch) {
        throw new ApiError(
            400,
            "INVALID_LESSON_ORDER",
            "Lesson IDs must exactly match the lessons in this topic"
        );
    }

    // Every temporary order is above every existing order, so it cannot
    // collide with a current value, and it is also above N, so it cannot
    // collide with the final values 1..N.
    const maxExistingOrder = existingLessons.reduce(
        (max, lesson) => Math.max(max, lesson.order),
        0
    );

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await Lesson.bulkWrite(
                lessonIds.map((id, index) => ({
                    updateOne: {
                        filter: { _id: id, topicId },
                        update: { $set: { order: maxExistingOrder + index + 1 } }
                    }
                })),
                { session }
            );

            await Lesson.bulkWrite(
                lessonIds.map((id, index) => ({
                    updateOne: {
                        filter: { _id: id, topicId },
                        update: { $set: { order: index + 1 } }
                    }
                })),
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return Lesson.find({ topicId }).sort({ order: 1 });
}


export {
    createLessonService,
    getLessonByIdService,
    getLessonsByTopicService,
    updateLessonService,
    reorderLessonsService,
    deleteLessonService
}