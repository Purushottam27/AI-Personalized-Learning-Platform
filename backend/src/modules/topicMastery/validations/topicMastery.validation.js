import { z } from "zod";
import { MASTERY_STATUS } from "../constants/mastery.constants.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const topicIdParamSchema = z.object({
    topicId: z.string().regex(objectIdRegex, "topicId must be a valid 24-character hex ObjectId"),
});

export const courseIdParamSchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId"),
});

export const courseTopicParamsSchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId"),
    topicId: z.string().regex(objectIdRegex, "topicId must be a valid 24-character hex ObjectId"),
});

export const learnerCourseMasteryQuerySchema = z.object({
    status: z.enum(Object.values(MASTERY_STATUS)).optional(),
});

export const learnerWeaknessQuerySchema = z.object({
    courseId: z.string().regex(objectIdRegex, "courseId must be a valid 24-character hex ObjectId").optional(),
});

export const instructorMasteryQuerySchema = z.object({
    learnerId: z.string().regex(objectIdRegex, "learnerId must be a valid 24-character hex ObjectId").optional(),
    status: z.enum(Object.values(MASTERY_STATUS)).optional(),
});
