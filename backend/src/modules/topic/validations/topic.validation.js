import {z} from 'zod'

const validateTopicSchema = z.object({
    title: z.string().trim().min(4).max(100),
    description: z.string().trim().max(500).optional(),
    learningObjectives:z.array(z.string().trim().min(4,'Learning objective cannot be empty').max(300, "Learning objective cannot exceed 300 characters")).min(1, "At least one learning objective is required")
    .max(7, "A maximum of 7 learning objectives is allowed")
}).strict()

const validateUpdateSchema = z.object({
    title: z.string().trim().min(4).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    
    learningObjectives:z.array(z.string().trim().min(4,'Learning objective cannot be empty').max(300, "Learning objective cannot exceed 300 characters")).min(1, "At least one learning objective is required")
    .max(7, "A maximum of 7 learning objectives is allowed").optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided for update"
    }
);

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const validateTopicIdSchema = z.object({
    topicId: z.string().regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId")
}).strict();

const validateTopicReorderSchema = z.object({
    topicIds: z.array(
        z.string().regex(
            OBJECT_ID_REGEX,
            "Invalid MongoDB ObjectId"
        )
    ).min(1, "At least one topic is required")
}).strict();

const validateCourseIdSchema = z.object({
    courseId: z.string().regex(
        OBJECT_ID_REGEX,
        "Invalid MongoDB ObjectId"
    )
}).strict();


export {
    validateTopicSchema,
    validateUpdateSchema,
    validateTopicIdSchema,
    validateTopicReorderSchema,
    validateCourseIdSchema
}