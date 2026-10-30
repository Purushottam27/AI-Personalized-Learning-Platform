import { ApiResponse } from "../../../shared/responses/ApiResponse.js";
import {
    getActiveStudyPlanService,
    generateStudyPlanService,
    getStudyPlanHistoryService,
    proposePlanRevisionService,
    acceptPlanRevisionService,
    chatWithAssistantService,
    getAssistantConversationService,
    updateLearnerStudyPreferencesService,
    getLearnerStudyPreferences,
} from "../services/studyPlan.service.js";

export async function getStudyPreferences(req, res) {
    const learnerId = req.user._id;
    const data = await getLearnerStudyPreferences(learnerId);
    return res.status(200).json(new ApiResponse(data, "Study preferences fetched successfully"));
}

export async function updateStudyPreferences(req, res) {
    const learnerId = req.user._id;
    const data = await updateLearnerStudyPreferencesService(learnerId, req.body);
    return res.status(200).json(new ApiResponse(data, "Study preferences updated successfully"));
}

export async function getActivePlan(req, res) {
    const learnerId = req.user._id;
    const plan = await getActiveStudyPlanService(learnerId);
    return res.status(200).json(new ApiResponse({ plan }, "Active study plan fetched successfully"));
}

export async function generatePlan(req, res) {
    const learnerId = req.user._id;
    const { revisionReason } = req.body || {};
    const plan = await generateStudyPlanService(learnerId, { revisionReason });
    return res.status(201).json(new ApiResponse({ plan }, "Study plan generated successfully"));
}

export async function getPlanHistory(req, res) {
    const learnerId = req.user._id;
    const data = await getStudyPlanHistoryService(learnerId);
    return res.status(200).json(new ApiResponse(data, "Study plan history fetched successfully"));
}

export async function proposePlanRevision(req, res) {
    const learnerId = req.user._id;
    const { reason } = req.body || {};
    const data = await proposePlanRevisionService(learnerId, reason);
    return res.status(200).json(new ApiResponse(data, "Plan revision proposed successfully"));
}

export async function acceptPlanRevision(req, res) {
    const learnerId = req.user._id;
    const plan = await acceptPlanRevisionService(learnerId, req.body);
    return res.status(200).json(new ApiResponse({ plan }, "Plan revision accepted successfully"));
}

export async function chatAssistant(req, res) {
    const learnerId = req.user._id;
    const { message, activityId } = req.body;
    const data = await chatWithAssistantService(learnerId, message, activityId);
    return res.status(200).json(new ApiResponse(data, "Assistant replied successfully"));
}

export async function getAssistantMessages(req, res) {
    const learnerId = req.user._id;
    const data = await getAssistantConversationService(learnerId);
    return res.status(200).json(new ApiResponse(data, "Assistant conversation fetched successfully"));
}
