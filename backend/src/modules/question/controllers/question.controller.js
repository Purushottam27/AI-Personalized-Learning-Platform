import {
    createQuestionService,
    getQuestionsByQuestionBankService,
    getQuestionByIdService,
    updateQuestionService,
    archiveQuestionService,
    restoreQuestionService
} from "../services/question.service.js";

import { ApiResponse } from "../../../shared/responses/ApiResponse.js";


export async function createQuestion(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;
    const questionData = req.body;

    const question = await createQuestionService(
        instructorId,
        questionBankId,
        questionData
    );

    res.status(201).json(new ApiResponse(question,"Question created successfully"));
}


export async function getQuestionsByQuestionBank(req, res) {
    const instructorId = req.user._id;
    const { questionBankId } = req.params;

    const questions = await getQuestionsByQuestionBankService(
        instructorId,
        questionBankId
    );

    res.status(200).json(new ApiResponse(questions,"Questions fetched successfully"));
}


export async function getQuestionById(req, res) {
    const instructorId = req.user._id;
    const { questionId } = req.params;

    const question = await getQuestionByIdService(
        instructorId,
        questionId
    );

    res.status(200).json(new ApiResponse(question,"Question fetched successfully"));
}


export async function updateQuestion(req, res) {
    const instructorId = req.user._id;
    const { questionId } = req.params;
    const updateData = req.body;

    const question = await updateQuestionService(
        instructorId,
        questionId,
        updateData
    );

    res.status(200).json(new ApiResponse(question,"Question updated successfully"));
}


export async function archiveQuestion(req, res) {
    const instructorId = req.user._id;
    const { questionId } = req.params;

    const question = await archiveQuestionService(
        instructorId,
        questionId
    );

    res.status(200).json(new ApiResponse(question,"Question archived successfully"));
}


export async function restoreQuestion(req, res) {
    const instructorId = req.user._id;
    const { questionId } = req.params;

    const question = await restoreQuestionService(
        instructorId,
        questionId
    );

    res.status(200).json(new ApiResponse(question,"Question restored successfully"));
}