import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const objectIdStringSchema = z.string().regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");
const assessmentTypeSchema = z.enum(["TOPIC", "DIAGNOSTIC", "FINAL"]);
const titleSchema = z.string().trim().min(3).max(150);
const descriptionSchema = z.string().trim().max(1000);
const MAX_ASSESSMENT_POOL_SIZE = 200;

const questionIdsSchema = z.array(objectIdStringSchema)
    .max(MAX_ASSESSMENT_POOL_SIZE, "Assessment cannot exceed 200 pool questions")
    .refine((ids) => new Set(ids.map((id) => id.toLowerCase())).size === ids.length, {
        message: "Duplicate question IDs are not allowed",
    });
const questionsPerAttemptSchema = z.number().int().min(5).max(10);
const passingScoreSchema = z.number().min(0).max(100);
const maxAttemptsSchema = z.number().int().min(1);
const timeLimitSchema = z.number().int().positive().nullable();
const dateSchema = z.coerce.date().nullable();

function validateWindow(data, ctx) {
    if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
        ctx.addIssue({ code: "custom", path: ["closesAt"], message: "closesAt must be later than opensAt" });
    }
}

export const createAssessmentSchema = z.object({
    courseId: objectIdStringSchema,
    topicId: objectIdStringSchema.optional(),
    type: assessmentTypeSchema,
    title: titleSchema,
    description: descriptionSchema.optional(),
    questionIds: questionIdsSchema.optional(),
    questionsPerAttempt: questionsPerAttemptSchema.optional(),
    passingScore: passingScoreSchema.optional(),
    maxAttempts: maxAttemptsSchema.optional(),
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    timeLimitMinutes: timeLimitSchema.optional(),
    opensAt: dateSchema.optional(),
    closesAt: dateSchema.optional(),
}).strict().superRefine((data, ctx) => {
    if (data.type === "TOPIC" && !data.topicId) {
        ctx.addIssue({ code: "custom", path: ["topicId"], message: "topicId is required for TOPIC assessments" });
    }
    if (data.type !== "TOPIC" && data.topicId) {
        ctx.addIssue({ code: "custom", path: ["topicId"], message: "Only TOPIC assessments can specify topicId" });
    }
    validateWindow(data, ctx);
});

export const updateAssessmentSchema = z.object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    questionIds: questionIdsSchema.optional(),
    questionsPerAttempt: questionsPerAttemptSchema.optional(),
    passingScore: passingScoreSchema.optional(),
    maxAttempts: maxAttemptsSchema.optional(),
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    timeLimitMinutes: timeLimitSchema.optional(),
    opensAt: dateSchema.optional(),
    closesAt: dateSchema.optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
}).superRefine(validateWindow);

export const assessmentIdSchema = z.object({ assessmentId: objectIdStringSchema }).passthrough();
export const assessmentCourseIdSchema = z.object({ courseId: objectIdStringSchema }).passthrough();
export const assessmentTopicIdSchema = z.object({ topicId: objectIdStringSchema }).passthrough();
