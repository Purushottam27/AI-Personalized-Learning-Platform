import { z } from "zod";
import { AI_CONSTANTS } from "../constants/aiAssistant.constants.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const historyItemSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1, "Message content cannot be empty").max(2000, "Message content exceeds limit"),
}).strict();

export const askAiAssistantBodySchema = z.object({
    question: z
        .string({ required_error: "question is required" })
        .trim()
        .min(AI_CONSTANTS.MIN_QUESTION_LENGTH, `Question must be at least ${AI_CONSTANTS.MIN_QUESTION_LENGTH} characters`)
        .max(AI_CONSTANTS.MAX_QUESTION_LENGTH, `Question cannot exceed ${AI_CONSTANTS.MAX_QUESTION_LENGTH} characters`),
    courseId: z
        .string()
        .regex(OBJECT_ID_REGEX, "courseId must be a valid 24-character hex ObjectId")
        .optional()
        .nullable(),
    topicId: z
        .string()
        .regex(OBJECT_ID_REGEX, "topicId must be a valid 24-character hex ObjectId")
        .optional()
        .nullable(),
    lessonId: z
        .string()
        .regex(OBJECT_ID_REGEX, "lessonId must be a valid 24-character hex ObjectId")
        .optional()
        .nullable(),
    history: z
        .array(historyItemSchema)
        .max(AI_CONSTANTS.MAX_HISTORY_MESSAGES, `Conversation history cannot exceed ${AI_CONSTANTS.MAX_HISTORY_MESSAGES} messages`)
        .optional()
        .default([]),
}).strict();
