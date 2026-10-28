import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const courseIdParamSchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId"),
});

export const analyticsOverviewQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(30).optional().default(7),
});
