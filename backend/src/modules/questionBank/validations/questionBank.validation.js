import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

const titleSchema = z.string().trim().min(3).max(150);

const descriptionSchema = z.string().trim().max(500);

export const createQuestionBankSchema = z
    .object({
        title: titleSchema,
        description: descriptionSchema.optional()
    })
    .strict();

export const updateQuestionBankSchema = z
    .object({
        title: titleSchema.optional(),
        description: descriptionSchema.optional()
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    });

export const questionBankIdSchema = z
    .object({
        questionBankId: objectIdStringSchema
    })
    .strict();

export const topicIdSchema = z
    .object({
        topicId: objectIdStringSchema
    })
    .strict();