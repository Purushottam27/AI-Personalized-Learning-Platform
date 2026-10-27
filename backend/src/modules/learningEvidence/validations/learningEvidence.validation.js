import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

export const learnerEvidenceQuerySchema = z.object({
    courseId: objectIdStringSchema.optional(),
    topicId: objectIdStringSchema.optional(),
    sourceType: z.enum(["PRACTICE", "ASSESSMENT"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const instructorEvidenceQuerySchema = z.object({
    learnerId: objectIdStringSchema.optional(),
    topicId: objectIdStringSchema.optional(),
    sourceType: z.enum(["PRACTICE", "ASSESSMENT"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const evidenceIdParamSchema = z.object({
    evidenceId: objectIdStringSchema,
}).strict();

export const courseIdParamSchema = z.object({
    courseId: objectIdStringSchema,
}).strict();
