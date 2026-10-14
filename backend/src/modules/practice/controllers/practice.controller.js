
import {
    createPracticeService,
    getPracticeByIdService,
    getPracticesByTopicService,
    updatePracticeService,
    publishPracticeService,
    archivePracticeService,
    restorePracticeService
} from "../services/practice.service.js";

import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function createPractice(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;

    const practice = await createPracticeService(
        instructorId,
        topicId,
        req.body
    );

    res.status(201).json(
        new ApiResponse(practice, "Practice created successfully")
    );
}

export async function getPracticesByTopic(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;

    const practices = await getPracticesByTopicService(
        instructorId,
        topicId
    );

    res.status(200).json(
        new ApiResponse(practices, "Practices fetched successfully")
    );
}

export async function getPracticeById(req, res) {
    const instructorId = req.user._id;
    const { practiceId } = req.params;

    const practice = await getPracticeByIdService(
        instructorId,
        practiceId
    );

    res.status(200).json(
        new ApiResponse(practice, "Practice fetched successfully")
    );
}

export async function updatePractice(req, res) {
    const instructorId = req.user._id;
    const { practiceId } = req.params;

    const practice = await updatePracticeService(
        instructorId,
        practiceId,
        req.body
    );

    res.status(200).json(
        new ApiResponse(practice, "Practice updated successfully")
    );
}

export async function publishPractice(req, res) {
    const instructorId = req.user._id;
    const { practiceId } = req.params;

    const practice = await publishPracticeService(
        instructorId,
        practiceId
    );

    res.status(200).json(
        new ApiResponse(practice, "Practice published successfully")
    );
}

export async function archivePractice(req, res) {
    const instructorId = req.user._id;
    const { practiceId } = req.params;

    const practice = await archivePracticeService(
        instructorId,
        practiceId
    );

    res.status(200).json(
        new ApiResponse(practice, "Practice archived successfully")
    );
}

export async function restorePractice(req, res) {
    const instructorId = req.user._id;
    const { practiceId } = req.params;

    const practice = await restorePracticeService(
        instructorId,
        practiceId
    );

    res.status(200).json(
        new ApiResponse(practice, "Practice restored successfully")
    );
}
