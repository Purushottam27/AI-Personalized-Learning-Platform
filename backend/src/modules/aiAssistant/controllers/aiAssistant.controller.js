import {
    askAiAssistantService, listAssistantConversations, createAssistantConversation,
    getAssistantConversation, renameAssistantConversation, deleteAssistantConversation
} from "../services/aiAssistant.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

const learnerIdFrom = (req) => req.user._id || req.user.id;

export async function askAssistant(req, res) {
    const body = req.validatedBody || req.body;
    const result = await askAiAssistantService({ learnerId: learnerIdFrom(req), ...body });
    res.status(200).json(new ApiResponse(result, "AI Assistant response generated successfully"));
}
export async function listAssistantChats(req, res) {
    res.status(200).json(new ApiResponse(await listAssistantConversations(learnerIdFrom(req))));
}
export async function createAssistantChat(req, res) {
    res.status(201).json(new ApiResponse(await createAssistantConversation(learnerIdFrom(req), req.validatedBody || req.body)));
}
export async function getAssistantChat(req, res) {
    res.status(200).json(new ApiResponse(await getAssistantConversation(learnerIdFrom(req), req.params.conversationId)));
}
export async function renameAssistantChat(req, res) {
    res.status(200).json(new ApiResponse(await renameAssistantConversation(learnerIdFrom(req), req.params.conversationId, (req.validatedBody || req.body).title)));
}
export async function deleteAssistantChat(req, res) {
    res.status(200).json(new ApiResponse(await deleteAssistantConversation(learnerIdFrom(req), req.params.conversationId)));
}
