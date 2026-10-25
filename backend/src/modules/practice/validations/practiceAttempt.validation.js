import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const practiceAttemptPracticeIdSchema = z.object({ practiceId: objectId }).passthrough();
export const practiceAttemptIdSchema = z.object({ attemptId: objectId }).passthrough();
export const practiceAttemptQuestionParamsSchema = z.object({ attemptId: objectId, questionId: objectId }).passthrough();

export const savePracticeAnswerSchema = z.object({
    answer: z.union([z.string().max(10), z.array(z.string().max(1)).max(26), z.null()]),
}).strict();

export const submitPracticeAttemptSchema = z.object({
    reason: z.enum(["MANUAL"]).optional(),
    answers: z.array(z.object({
        questionId: objectId,
        answer: z.union([z.string().max(10), z.array(z.string().max(1)).max(26), z.null()]),
    })).optional(),
});

