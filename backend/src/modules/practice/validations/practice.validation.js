
import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

const titleSchema = z.string().trim().min(3).max(150);

const descriptionSchema = z.string().trim().max(1000);

const MAX_PRACTICE_QUESTIONS = 200;

const questionIdsSchema = z
    .array(objectIdStringSchema)
    .max(MAX_PRACTICE_QUESTIONS, "Practice cannot exceed 200 questions")
    .refine(
        (ids) => {
            const normalizedIds = ids.map((id) => id.toLowerCase());
            return new Set(normalizedIds).size === normalizedIds.length;
        },
        {
            message: "Duplicate question IDs are not allowed",
        }
    );

// Create Practice
export const createPracticeSchema = z
    .object({
        title: titleSchema,
        description: descriptionSchema.optional(),
        questionIds: questionIdsSchema.optional(),
        contributeToLearningEvidence: z.boolean().optional(),
    })
    .strict();

// Update Practice (PATCH semantics)
export const updatePracticeSchema = z
    .object({
        title: titleSchema.optional(),
        description: descriptionSchema.optional(),
        questionIds: questionIdsSchema.optional(),
        contributeToLearningEvidence: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

// Path parameters
export const practiceIdSchema = z
    .object({
        practiceId: objectIdStringSchema,
    })
    .passthrough();

export const topicIdSchema = z
    .object({
        topicId: objectIdStringSchema,
    })
    .passthrough();
