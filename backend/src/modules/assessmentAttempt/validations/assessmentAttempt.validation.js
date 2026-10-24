import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");
export const attemptAssessmentIdSchema = z.object({ assessmentId: objectId }).passthrough();
export const attemptIdSchema = z.object({ attemptId: objectId }).passthrough();
export const attemptQuestionParamsSchema = z.object({ attemptId: objectId, questionId: objectId }).passthrough();
export const saveAttemptAnswerSchema = z.object({
    answer: z.union([z.string().max(5), z.array(z.string().max(1)).max(26), z.null()]),
}).strict();
export const submitAttemptSchema = z.object({ reason: z.enum(["MANUAL", "LEFT"]).optional() }).strict();
