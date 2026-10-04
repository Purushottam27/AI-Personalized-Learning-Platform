import {
    createQuestionBankService,
    getQuestionBankByTopicService,
    getQuestionBankByIdService,
    updateQuestionBankService,
    archiveQuestionBankService,
    restoreQuestionBankService
} from "../services/questionBank.service.js";

import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function createQuestionBank(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;
    const { title, description } = req.body;

    const questionBank = await createQuestionBankService(instructorId, topicId, {
        title,
        description
    });

    res.status(201).json(new ApiResponse(questionBank, "Question bank created successfully"));
}

export async function getQuestionBankByTopic(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;

    const questionBank = await getQuestionBankByTopicService(instructorId, topicId);

    res.status(200).json(new ApiResponse(questionBank, "Question bank fetched successfully"));
}

export async function getQuestionBankById(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;

    const questionBank = await getQuestionBankByIdService(instructorId, questionBankId);

    res.status(200).json(new ApiResponse(questionBank, "Question bank fetched successfully"));
}

export async function updateQuestionBank(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;
    const updateData = req.body;

    const questionBank = await updateQuestionBankService(instructorId, questionBankId, updateData);

    res.status(200).json(new ApiResponse(questionBank, "Question bank updated successfully"));
}

export async function archiveQuestionBank(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;

    const questionBank = await archiveQuestionBankService(instructorId, questionBankId);

    res.status(200).json(new ApiResponse(questionBank, "Question bank archived successfully"));
}

export async function restoreQuestionBank(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;

    const questionBank = await restoreQuestionBankService(instructorId, questionBankId);

    res.status(200).json(new ApiResponse(questionBank, "Question bank restored successfully"));
}