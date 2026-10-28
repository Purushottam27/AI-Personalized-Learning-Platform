import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const courseIdParamSchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId"),
});

export const recommendationsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
