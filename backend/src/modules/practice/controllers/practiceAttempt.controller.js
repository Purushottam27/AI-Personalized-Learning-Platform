import {
    startPracticeAttemptService,
    savePracticeAnswerService,
    submitPracticeAttemptService,
    getPracticeAttemptService,
    getPracticeAttemptHistoryService,
} from "../services/practiceAttempt.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function startPracticeAttempt(req, res) {
    const learnerId = req.user._id || req.user.id;
    const attempt = await startPracticeAttemptService(learnerId, req.params.practiceId);
    res.status(201).json(new ApiResponse(attempt, "Practice attempt started successfully"));
}

export async function savePracticeAnswer(req, res) {
    const learnerId = req.user._id || req.user.id;
    const attempt = await savePracticeAnswerService(learnerId, req.params.attemptId, req.params.questionId, req.body.answer);
    res.status(200).json(new ApiResponse(attempt, "Answer saved successfully"));
}

export async function submitPracticeAttempt(req, res) {
    const learnerId = req.user._id || req.user.id;
    const attempt = await submitPracticeAttemptService(learnerId, req.params.attemptId, req.body.answers, req.body.reason ?? "MANUAL");
    res.status(200).json(new ApiResponse(attempt, "Practice attempt submitted successfully"));
}

export async function getPracticeAttempt(req, res) {
    const learnerId = req.user._id || req.user.id;
    const attempt = await getPracticeAttemptService(learnerId, req.params.attemptId);
    res.status(200).json(new ApiResponse(attempt, "Practice attempt fetched successfully"));
}

export async function getPracticeAttemptHistory(req, res) {
    const learnerId = req.user._id || req.user.id;
    const history = await getPracticeAttemptHistoryService(learnerId, req.params.practiceId);
    res.status(200).json(new ApiResponse(history, "Practice attempt history fetched successfully"));
}
