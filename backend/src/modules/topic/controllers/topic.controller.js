import {
    createTopicService,
    getTopicsByCourseService,
    getTopicByIdService,
    updateTopicService,
    reorderTopicsService
} from "../services/topic.service.js";

import { ApiResponse } from "../../../shared/responses/ApiResponse.js";


const createTopic = async (req, res) => {
    const { courseId } = req.params;

    const topic = await createTopicService(
        courseId,
        req.user._id,
        req.body
    );

    return res.status(201).json(
        new ApiResponse(
            topic,
            "Topic created successfully"
        )
    );
};


const getTopicsByCourse = async (req, res) => {
    const { courseId } = req.params;

    const topics = await getTopicsByCourseService(courseId,req.user._id);

    return res.status(200).json(
        new ApiResponse(
            topics,
            "Topics fetched successfully"
        )
    );
};


const getTopicById = async (req, res) => {
    const { topicId } = req.params;

    const topic = await getTopicByIdService(
        topicId,
        req.user._id
    );

    return res.status(200).json(
        new ApiResponse(
            topic,
            "Topic fetched successfully"
        )
    );
};


const updateTopic = async (req, res) => {
    const { topicId } = req.params;

    const topic = await updateTopicService(
        topicId,
        req.user._id,
        req.body
    );

    return res.status(200).json(
        new ApiResponse(
            topic,
            "Topic updated successfully"
        )
    );
};


const reorderTopics = async (req, res) => {
    const { courseId } = req.params;
    const { topicIds } = req.body;

    const topics = await reorderTopicsService(
        courseId,
        req.user._id,
        topicIds
    );

    return res.status(200).json(
        new ApiResponse(
            topics,
            "Topics reordered successfully"
        )
    );
};


export {
    createTopic,
    getTopicsByCourse,
    getTopicById,
    updateTopic,
    reorderTopics
};