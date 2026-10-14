/**
 * Explicit API allowlist for resource documents.
 * Cloudinary storage identifiers and delivery configuration are internal-only.
 */
const RESOURCE_RESPONSE_FIELDS = [
    "_id", "topicId", "lessonId", "title", "description", "type", "source",
    "provider", "url", "fileFormat", "fileSize", "order", "status", "createdAt", "updatedAt"
];

export function toResourceResponse(resource) {
    if (!resource) return resource;

    const source = typeof resource.toObject === "function"
        ? resource.toObject({ virtuals: false })
        : resource;

    return Object.fromEntries(
        RESOURCE_RESPONSE_FIELDS
            .filter((field) => source[field] !== undefined)
            .map((field) => [field, source[field]])
    );
}

export function toResourceResponseList(resources) {
    return resources.map(toResourceResponse);
}
