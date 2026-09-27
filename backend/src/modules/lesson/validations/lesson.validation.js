import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");


const textBlockSchema = z.object({
    type: z.literal("TEXT"),
    content: z.string().trim().min(1).max(20000)
}).strict();


const headingBlockSchema = z.object({
    type: z.literal("HEADING"),
    level: z.union([
        z.literal(2),
        z.literal(3)
    ]),
    content: z.string().trim().min(1).max(200)
}).strict();


const codeBlockSchema = z.object({
    type: z.literal("CODE"),
    language: z.string().trim().min(1).max(50),
    content: z.string().min(1).max(30000)
}).strict();


const imageBlockSchema = z.object({
    type: z.literal("IMAGE"),
    url: z.string().url(),
    alt: z.string().trim().min(1).max(300)
}).strict();


const videoBlockSchema = z.object({
    type: z.literal("VIDEO"),
    url: z.string().url(),
    title: z.string().trim().min(1).max(200)
}).strict();


const calloutBlockSchema = z.object({
    type: z.literal("CALLOUT"),
    variant: z.enum([
        "INFO",
        "TIP",
        "WARNING",
        "IMPORTANT"
    ]),
    content: z.string().trim().min(1).max(2000)
}).strict();


const listBlockSchema = z.object({
    type: z.literal("LIST"),
    style: z.enum([
        "BULLETED",
        "NUMBERED"
    ]),
    items: z.array(
        z.string().trim().min(1).max(500)
    )
        .min(1)
        .max(50)
}).strict();


const contentBlockSchema = z.discriminatedUnion("type", [
    textBlockSchema,
    headingBlockSchema,
    codeBlockSchema,
    imageBlockSchema,
    videoBlockSchema,
    calloutBlockSchema,
    listBlockSchema
]);

const lessonContentSchema = z
    .array(contentBlockSchema)
    .min(1, "Lesson must contain at least one content block")
    .max(100, "Lesson cannot contain more than 100 content blocks");


export const createLessonSchema = z.object({
    title: z.string()
        .trim()
        .min(4)
        .max(150),

    description: z.string()
        .trim()
        .max(500)
        .optional(),

    content: lessonContentSchema
}).strict();


export const updateLessonSchema = z.object({
    title: z.string()
        .trim()
        .min(4)
        .max(150)
        .optional(),

    description: z.string()
        .trim()
        .max(500)
        .optional(),

    content: lessonContentSchema.optional()
})
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update"
        }
    );


export const lessonIdSchema = z.object({
    lessonId: objectIdStringSchema
}).strict();


export const topicIdSchema = z.object({
    topicId: objectIdStringSchema
}).strict();


export const reorderLessonsSchema = z.object({
    lessonIds: z.array(
        objectIdStringSchema
    )
        .min(1, "At least one lesson is required")
        .max(100, "Too many lessons")
        .refine(
            (lessonIds) => new Set(lessonIds).size === lessonIds.length,
            {
                message: "Duplicate lesson IDs are not allowed"
            }
        )
}).strict();