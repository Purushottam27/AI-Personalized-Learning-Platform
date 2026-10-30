import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const courseIdParamSchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId"),
});

export const analyticsOverviewQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(30).optional().default(7),
});

export const instructorAnalyticsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN", "ALL"]).optional().default("ALL"),
    search: z.string().trim().max(100).optional(),
});

export const assessmentIdParamSchema = z.object({
    assessmentId: z.string().regex(objectIdRegex, "assessmentId must be a valid 24-character hex ObjectId"),
});

