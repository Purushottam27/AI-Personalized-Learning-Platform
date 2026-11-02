import { z } from "zod";
import { AI_CONSTANTS } from "../constants/aiAssistant.constants.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const historyItemSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000)
}).strict();

export const askAiAssistantBodySchema = z.object({
    question: z.string().trim().min(AI_CONSTANTS.MIN_QUESTION_LENGTH).max(AI_CONSTANTS.MAX_QUESTION_LENGTH),
    conversationId: z.string().regex(OBJECT_ID_REGEX),
    courseId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
    topicId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
    lessonId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
    history: z.array(historyItemSchema).max(AI_CONSTANTS.MAX_HISTORY_MESSAGES).optional().default([])
}).strict();

export const createConversationSchema = z.object({
    courseId: z.string().regex(OBJECT_ID_REGEX).optional().nullable()
}).strict();

export const renameConversationSchema = z.object({
    title: z.string().trim().min(1).max(80)
}).strict();
