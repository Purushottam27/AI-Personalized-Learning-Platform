import {
    getLearnerTopicMasteryService,
    getLearnerCourseMasteryService,
    getLearnerWeaknessesService,
    recalculateTopicMasteryService,
    getInstructorTopicMasteryService,
    serializeTopicMastery,
} from "../services/topicMastery.service.js";
import { Topic } from "../../topic/models/topic.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function getLearnerTopicMastery(req, res) {
    const result = await getLearnerTopicMasteryService(req.user._id, req.params.topicId);
    return res.status(200).json(new ApiResponse(result, "Topic mastery fetched successfully"));
}

export async function getLearnerCourseMastery(req, res) {
    const result = await getLearnerCourseMasteryService(
        req.user._id,
        req.params.courseId,
        req.validatedQuery
    );
    return res.status(200).json(new ApiResponse(result, "Course topic mastery fetched successfully"));
}

export async function getLearnerWeaknesses(req, res) {
    const result = await getLearnerWeaknessesService(req.user._id, req.validatedQuery);
    return res.status(200).json(new ApiResponse(result, "Learner weaknesses fetched successfully"));
}

export async function recalculateLearnerTopicMastery(req, res) {
    const topic = await Topic.findById(req.params.topicId);
    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const mastery = await recalculateTopicMasteryService(
        req.user._id,
        topic.courseId,
        topic._id
    );

    return res.status(200).json(
        new ApiResponse(serializeTopicMastery(mastery), "Topic mastery recalculated successfully")
    );
}

export async function getInstructorTopicMastery(req, res) {
    const result = await getInstructorTopicMasteryService(
        req.user._id,
        req.params.courseId,
        req.params.topicId,
        req.validatedQuery
    );
    return res.status(200).json(new ApiResponse(result, "Instructor topic mastery fetched successfully"));
}
