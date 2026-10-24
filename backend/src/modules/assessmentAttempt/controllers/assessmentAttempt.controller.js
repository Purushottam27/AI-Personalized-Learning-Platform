import {
    startAssessmentAttemptService,
    saveAssessmentAnswerService,
    submitAssessmentAttemptService,
    getAssessmentAttemptService,
    getAssessmentAttemptHistoryService,
} from "../services/assessmentAttempt.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function startAssessmentAttempt(req, res) {
    const attempt = await startAssessmentAttemptService(req.user._id, req.params.assessmentId);
    res.status(201).json(new ApiResponse(attempt, "Assessment attempt started successfully"));
}
export async function saveAssessmentAnswer(req, res) {
    const attempt = await saveAssessmentAnswerService(req.user._id, req.params.attemptId, req.params.questionId, req.body.answer);
    res.status(200).json(new ApiResponse(attempt, "Answer saved successfully"));
}
export async function submitAssessmentAttempt(req, res) {
    const attempt = await submitAssessmentAttemptService(req.user._id, req.params.attemptId, req.body.reason ?? "MANUAL");
    res.status(200).json(new ApiResponse(attempt, "Assessment attempt submitted successfully"));
}
export async function getAssessmentAttempt(req, res) {
    const attempt = await getAssessmentAttemptService(req.user._id, req.params.attemptId);
    res.status(200).json(new ApiResponse(attempt, "Assessment attempt fetched successfully"));
}
export async function getAssessmentAttemptHistory(req, res) {
    const history = await getAssessmentAttemptHistoryService(req.user._id, req.params.assessmentId);
    res.status(200).json(new ApiResponse(history, "Assessment attempt history fetched successfully"));
}
