import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdStringSchema = z.string().regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

const titleSchema = z.string().trim().min(3).max(150);

const descriptionSchema = z.string().trim().max(500);

const urlSchema = z.string().trim().url(); // z.url()

// EXTERNAL_URL resources share an identical shape regardless of type
// (VIDEO, DOCUMENT, LINK all just point at an external url), so a single
// branch covers all three rather than duplicating three near-identical schemas.
const externalUrlResourceSchema = z
    .object({
        type: z.enum(["VIDEO", "DOCUMENT", "LINK"]),
        source: z.literal("EXTERNAL_URL"),
        title: titleSchema,
        description: descriptionSchema.optional(),
        lessonId: objectIdStringSchema.optional(),
        url: urlSchema
    }).strict();

// UPLOAD is only valid for DOCUMENT in the MVP, so type is pinned to that
// literal here — VIDEO/LINK + UPLOAD is rejected simply because no branch
// of the union accepts it.
const uploadedDocumentResourceSchema = z
    .object({
        type: z.literal("DOCUMENT"),
        source: z.literal("UPLOAD"),
        title: titleSchema,
        description: descriptionSchema.optional(),
        lessonId: objectIdStringSchema.optional()
    }).strict();

export const createResourceSchema = z.discriminatedUnion("source", [
    externalUrlResourceSchema,
    uploadedDocumentResourceSchema
]);

export const updateResourceSchema = z.object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    url: urlSchema.optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
}); 

export const resourceIdSchema = z.object({
    resourceId: objectIdStringSchema
}).strict();

export const reorderResourcesSchema = z.object({
    resourceIds: z
        .array(objectIdStringSchema).min(1).max(100)
        .refine(
            (ids) => new Set(ids).size === ids.length,
            {
                message: "Duplicate resource IDs are not allowed"
            }
        )
}).strict();