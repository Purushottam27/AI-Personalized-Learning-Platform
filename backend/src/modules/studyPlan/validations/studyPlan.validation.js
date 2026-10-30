import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const updateStudyPreferencesSchema = z.object({
    dailyStudyTime: z.enum([
        "Less than 1 hour",
        "1-2 hours",
        "2-3 hours",
        "3-4 hours",
        "5 or more hours"
    ]).optional(),
    preferredLearningFormat: z.array(z.enum([
        "Reading",
        "Videos",
        "Interactive Learning",
        "Practice Exercises",
        "Projects"
    ])).optional(),
    studyDays: z.array(z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY"
    ])).min(1, "Select at least one study day").optional(),
    preferredSessionDuration: z.number().int().min(15).max(180).optional(),
    preferredTimeOfDay: z.enum(["MORNING", "AFTERNOON", "EVENING", "NIGHT", "ANYTIME"]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one study preference field must be provided"
});

export const assistantChatSchema = z.object({
    message: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
    activityId: z.string().trim().max(100).optional()
});

export const acceptRevisionSchema = z.object({
    proposalId: z.string().regex(objectIdRegex, "Invalid proposal ID")
}).strict();

