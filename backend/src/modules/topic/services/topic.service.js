import { Topic } from "../models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import mongoose from "mongoose";

const createTopicService = async (courseId, userId, topicData) => {
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "FORBIDDEN",
            "You are not authorized to modify this course"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_NOT_EDITABLE",
            "Topics cannot  be created while the course is archived"
        );
    }

    const lastTopic = await Topic.findOne({
        courseId
    }).sort({order:-1}).select('order')

    const topic = await Topic.create({
        ...topicData,
        courseId,
        order:  lastTopic ? lastTopic.order + 1 : 1  
    });

    return topic;
};


const getTopicsByCourseService = async (courseId, userId) => {
    const course = await Course.findById(courseId)
        .select("createdBy");

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "FORBIDDEN",
            "You are not authorized to access these topics"
        );
    }

    return Topic.find({
        courseId
    }).sort({ order: 1 });
};


const getTopicByIdService = async (topicId, userId) => {
    const topic = await Topic.findById(topicId);

    if (!topic) {
        throw new ApiError(
            404,
            "TOPIC_NOT_FOUND",
            "Topic not found"
        );
    }

    const course = await Course.findById(topic.courseId);

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "FORBIDDEN",
            "You are not authorized to access this topic"
        );
    }

    return topic;
};


const updateTopicService = async (topicId, userId, updateData) => {
    const topic = await Topic.findById(topicId);

    if (!topic) {
        throw new ApiError(
            404,
            "TOPIC_NOT_FOUND",
            "Topic not found"
        );
    }

    const course = await Course.findById(topic.courseId);

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "FORBIDDEN",
            "You are not authorized to modify this topic"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_NOT_EDITABLE",
            "Topics cannot be updated while the course is archived"
        );
    }

    Object.assign(topic, updateData);

    await topic.save();

    return topic;
};


const reorderTopicsService = async (courseId, userId, topicIds) => {
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "FORBIDDEN",
            "You are not authorized to modify this course"
        );
    }

    if (course.status !== "DRAFT") {
        throw new ApiError(
            409,
            "COURSE_NOT_EDITABLE",
            "Topics can only be reordered while the course is in draft status"
        );
    }

    const existingTopics = await Topic.find({
        courseId
    }).select("_id");

    if (existingTopics.length !== topicIds.length) {
        throw new ApiError(
            400,
            "INVALID_TOPIC_ORDER",
            "The topic list must contain every topic in the course"
        );
    }

    const existingTopicIds = new Set(
        existingTopics.map((topic) => topic._id.toString())
    );

    const submittedTopicIds = new Set(
        topicIds.map((topicId) => topicId.toString())
    );

    if (
        submittedTopicIds.size !== topicIds.length ||
        submittedTopicIds.size !== existingTopicIds.size ||
        [...submittedTopicIds].some(
            (topicId) => !existingTopicIds.has(topicId)
        )
    ) {
        throw new ApiError(
            400,
            "INVALID_TOPIC_ORDER",
            "The topic list must contain exactly the topics belonging to this course"
        );
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {

            // Step 1: Move all existing topics to temporary orders
            const temporaryOperations = existingTopics.map(
                (topic, index) => ({
                    updateOne: {
                        filter: {
                            _id: topic._id,
                            courseId
                        },
                        update: {
                            $set: {
                                order: 1000000 + index
                            }
                        }
                    }
                })
            );

            await Topic.bulkWrite(
                temporaryOperations,
                { session }
            );

            // Step 2: Assign the final order
            const finalOperations = topicIds.map(
                (topicId, index) => ({
                    updateOne: {
                        filter: {
                            _id: topicId,
                            courseId
                        },
                        update: {
                            $set: {
                                order: index + 1
                            }
                        }
                    }
                })
            );

            await Topic.bulkWrite(
                finalOperations,
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return Topic.find({
        courseId
    }).sort({ order: 1 });
};


export {
    createTopicService,
    getTopicsByCourseService,
    getTopicByIdService,
    updateTopicService,
    reorderTopicsService
};