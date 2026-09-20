import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z.string()
    .regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

const objectivesSchema = z.array(z.string().trim().min(1, "Objective cannot be empty")).min(1).max(10);

// DERIVED exists on the model but is not supported by the API in the current MVP.
const estimatedDurationCreateSchema = z.object({
    source: z.literal("MANUAL"),
    hours: z.number().positive().nullable().optional(),
    weeks: z.number().positive().nullable().optional()
}).strict().optional();

const estimatedDurationUpdateSchema = z.object({
    source: z.literal("MANUAL").optional(),
    hours: z.number().positive().nullable().optional(),
    weeks: z.number().positive().nullable().optional()
}).strict().optional();

const prerequisitesSchema = z.object({
    courses: z.array(objectIdStringSchema).optional(),
    knowledge: z.array(z.string().trim().min(1, "Knowledge prerequisite cannot be empty")).optional()
}).strict().optional();

const diagnosticPolicySchema = z.object({
    enabled: z.boolean().optional(),
    passingScore: z.number().min(0).max(100).nullable().optional(),
    questionsPerAttempt: z.number().int().positive().nullable().optional(),
    randomizeQuestions: z.boolean().optional()
}).strict().optional();

const progressionPolicySchema = z.object({
        lockingEnabled: z.boolean().optional()
}).strict().optional();


export const createCourseSchema = z.object({
    title: z.string().trim().min(4).max(150),
    description: z.string().trim().min(20).max(5000),
    domain: z.string().trim().min(1),
    category: z.string().trim().min(1),
    difficulty: difficultySchema,
    objectives: objectivesSchema,
    estimatedDuration: estimatedDurationCreateSchema,
    prerequisites: prerequisitesSchema,
    diagnosticPolicy: diagnosticPolicySchema,
    progressionPolicy: progressionPolicySchema
}).strict();

export const updateCourseSchema = z.object({
    title: z.string().trim().min(4).max(150).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    domain: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    difficulty: difficultySchema.optional(),
    objectives: objectivesSchema.optional(),
    estimatedDuration: estimatedDurationUpdateSchema,
    prerequisites: prerequisitesSchema,
    diagnosticPolicy: diagnosticPolicySchema,
    progressionPolicy: progressionPolicySchema
})
.strict()
.refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"});


export const courseIdSchema = z.object({
    courseId: objectIdStringSchema
}).strict();


export const courseDiscoveryQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    domain: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    difficulty: difficultySchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();