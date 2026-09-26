import {z} from 'zod'

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const validateEnrollmentIdSchema = z.object({
    enrollmentId: z.string().regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId")
}).strict();

export {
    validateEnrollmentIdSchema
}