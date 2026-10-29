import mongoose from "mongoose";
import path from "path";

import { Resource } from "../models/resource.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { assertTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";

import { ApiError } from "../../../shared/errors/ApiError.js";
import { uploadOnCloudinary } from "../../../shared/utils/cloudinary.js";
import cloudinary from "../../../config/cloudinary.js";

const FILE_FORMAT_BY_EXTENSION = {
    ".pdf": "PDF",
    ".ppt": "PPT",
    ".pptx": "PPTX",
    ".doc": "DOC",
    ".docx": "DOCX"
};

const EXTENSION_BY_FILE_FORMAT = {
    PDF: "pdf",
    PPT: "ppt",
    PPTX: "pptx",
    DOC: "doc",
    DOCX: "docx"
};

const RESOURCE_DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

// Helper functions:

async function getOwnedTopicAndCourse(instructorId, topicId) {
    const topic = await Topic.findById(topicId);

    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    return { topic, course };
}

async function getOwnedResourceContext(instructorId, resourceId) {
    const resource = await Resource.findById(resourceId);

    if (!resource) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const topic = await Topic.findById(resource.topicId);

    if (!topic) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course || course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    return { resource, topic, course };
}

async function validateLessonBelongsToTopic(topicId, lessonId) {
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
        throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    if (lesson.topicId.toString() !== topicId.toString()) {
        throw new ApiError(
            400,
            "LESSON_NOT_IN_TOPIC",
            "Lesson does not belong to the specified topic"
        );
    }
}

function assertCourseNotArchived(course) {
    if (course.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "COURSE_ARCHIVED",
            "Resources cannot be modified in an archived course"
        );
    }
}

async function getNextResourceOrder(topicId) {
    const lastResource = await Resource.findOne({ topicId }).sort({ order: -1 });

    return lastResource ? lastResource.order + 1 : 1;
}

function detectVideoProvider(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        if( hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "youtu.be"){
            return "YOUTUBE";
        }

        if ( hostname === "drive.google.com" || hostname === "docs.google.com"){
            return "GOOGLE_DRIVE";
        }

        if ( hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
            return "VIMEO";
        }

        return "OTHER";
    } catch (error) {
        return "OTHER";
    }
}

function getFileFormat(originalname) {
    const extension = path.extname(originalname).toLowerCase();
    const fileFormat = FILE_FORMAT_BY_EXTENSION[extension];

    if (!fileFormat) {
        throw new ApiError(
            400,
            "INVALID_FILE_FORMAT",
            "Unable to determine file format from the uploaded file"
        );
    }

    return fileFormat;
}

async function cleanupCloudinaryAsset(publicId, resourceType) {
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType ?? "raw",
            type: "authenticated"
        });
    } catch (cleanupError) {
        // Best-effort only: never let a cleanup failure hide the original error.
        console.error("Failed to clean up orphaned Cloudinary asset:", publicId, cleanupError);
    }
}

async function createExternalResource(topicId, resourceData) {
    const provider = resourceData.type === "VIDEO" ? detectVideoProvider(resourceData.url) : null;

    const order = await getNextResourceOrder(topicId);

    const resource = await Resource.create({
        topicId,
        lessonId: resourceData.lessonId ?? null,
        title: resourceData.title,
        description: resourceData.description ?? "",
        type: resourceData.type,
        source: "EXTERNAL_URL",
        provider,
        url: resourceData.url,
        storageReference: null,
        fileFormat: null,
        fileSize: null,
        order,
        status: "ACTIVE"
    });

    return resource;
}

async function createUploadedResource(topicId, resourceData, file) {
    if (!file) {
        throw new ApiError(400, "FILE_REQUIRED", "A file is required for uploaded document resources");
    }

    const fileFormat = getFileFormat(file.originalname);

    // Resource documents are uploaded as authenticated raw assets. Do not change
    // the shared helper's default because avatars use its existing public-upload behavior.
    const cloudinaryResponse = await uploadOnCloudinary(file.path, {
        resource_type: "raw",
        type: "authenticated"
    });

    if (!cloudinaryResponse) {
        throw new ApiError(500, "UPLOAD_FAILED", "File upload failed");
    }

    try {
        const order = await getNextResourceOrder(topicId);

        const resource = await Resource.create({
            topicId,
            lessonId: resourceData.lessonId ?? null,
            title: resourceData.title,
            description: resourceData.description ?? "",
            type: "DOCUMENT",
            source: "UPLOAD",
            provider: null,
            url: null,
            storageReference: cloudinaryResponse.public_id,
            storageAccess: "AUTHENTICATED",
            storageResourceType: cloudinaryResponse.resource_type,
            fileFormat,
            fileSize: file.size,
            order,
            status: "ACTIVE"
        });

        return resource;
    } catch (error) {
        await cleanupCloudinaryAsset(cloudinaryResponse.public_id, cloudinaryResponse.resource_type);
        throw error;
    }
}

// Actual service function:

export async function createResourceService(instructorId, topicId, resourceData, file) {
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);

    assertCourseNotArchived(course);

    if (resourceData.lessonId) {
        await validateLessonBelongsToTopic(topicId, resourceData.lessonId);
    }

    if (resourceData.source === "EXTERNAL_URL") {
        return createExternalResource(topicId, resourceData);
    }

    return createUploadedResource(topicId, resourceData, file);
}

export async function getResourcesByTopicService(userId, topicId, userRole = "INSTRUCTOR") {
    const topic = await Topic.findById(topicId);
    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        return Resource.find({ topicId }).sort({ order: 1 });
    }

    if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED") {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        const enrollment = await Enrollment.findOne({
            learnerId: userId,
            courseId: course._id,
            status: "ACTIVE"
        });
        if (!enrollment) {
            throw new ApiError(
                403,
                "ACTIVE_ENROLLMENT_REQUIRED",
                "Active course enrollment is required to access resources"
            );
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
        return Resource.find({ topicId, status: "ACTIVE" }).sort({ order: 1 });
    }

    if (userRole === "ADMIN") {
        return Resource.find({ topicId }).sort({ order: 1 });
    }

    throw new ApiError(403, "FORBIDDEN", "Access denied");
}

export async function getResourceByIdService(userId, resourceId, userRole = "INSTRUCTOR") {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const topic = await Topic.findById(resource.topicId);
    if (!topic) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const course = await Course.findById(topic.courseId);
    if (!course) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
        }
        return resource;
    }

    if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED" || resource.status !== "ACTIVE") {
            throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
        }
        const enrollment = await Enrollment.findOne({
            learnerId: userId,
            courseId: course._id,
            status: "ACTIVE"
        });
        if (!enrollment) {
            throw new ApiError(
                403,
                "ACTIVE_ENROLLMENT_REQUIRED",
                "Active course enrollment is required to access resources"
            );
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
        return resource;
    }

    if (userRole === "ADMIN") {
        return resource;
    }

    throw new ApiError(403, "FORBIDDEN", "Access denied");
}

export async function updateResourceService(instructorId, resourceId, updateData) {
    const { resource, course } = await getOwnedResourceContext(instructorId, resourceId);

    assertCourseNotArchived(course);

    if (updateData.title !== undefined) {
        resource.title = updateData.title;
    }

    if (updateData.description !== undefined) {
        resource.description = updateData.description;
    }

    if (updateData.url !== undefined) {
        if (resource.source !== "EXTERNAL_URL") {
            throw new ApiError(
                400,
                "INVALID_RESOURCE_UPDATE",
                "URL cannot be updated for uploaded resources"
            );
        }

        resource.url = updateData.url;
        resource.provider = resource.type === "VIDEO" ? detectVideoProvider(updateData.url) : null;
    }

    await resource.save();

    return resource;
}

/**
 * Creates a five-minute, signed Cloudinary download URL after checking that
 * the requesting instructor or enrolled learner has access to the resource. Legacy public uploads are
 * deliberately blocked until their Cloudinary delivery type is migrated.
 */
export async function getResourceDownloadUrlService(userId, resourceId, userRole = "INSTRUCTOR") {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const topic = await Topic.findById(resource.topicId);
    if (!topic) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    const course = await Course.findById(topic.courseId);
    if (!course) {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
        }
    } else if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED" || resource.status !== "ACTIVE") {
            throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
        }
        const enrollment = await Enrollment.findOne({
            learnerId: userId,
            courseId: course._id,
            status: "ACTIVE"
        });
        if (!enrollment) {
            throw new ApiError(
                403,
                "ACTIVE_ENROLLMENT_REQUIRED",
                "Active course enrollment is required to download resources"
            );
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
    } else if (userRole !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Access denied");
    }

    if (resource.source !== "UPLOAD" || resource.type !== "DOCUMENT") {
        throw new ApiError(
            400,
            "RESOURCE_FILE_NOT_AVAILABLE",
            "Only uploaded document resources have downloadable files"
        );
    }

    if (resource.status !== "ACTIVE") {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    }

    // Select-false fields are loaded explicitly. Existing records have no access
    // metadata and must be migrated rather than treated as private by assumption.
    const securedResource = await Resource.findById(resourceId)
        .select("+storageReference +storageAccess +storageResourceType fileFormat source type status");

    if (
        !securedResource?.storageReference ||
        securedResource.storageAccess !== "AUTHENTICATED" ||
        !securedResource.storageResourceType
    ) {
        throw new ApiError(
            409,
            "RESOURCE_FILE_MIGRATION_REQUIRED",
            "This uploaded file must be migrated to private delivery before it can be opened"
        );
    }

    const format = EXTENSION_BY_FILE_FORMAT[securedResource.fileFormat];
    if (!format) {
        throw new ApiError(
            409,
            "RESOURCE_FILE_FORMAT_UNSUPPORTED",
            "A secure download URL cannot be generated for this file format"
        );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + RESOURCE_DOWNLOAD_URL_TTL_SECONDS;
    const url = cloudinary.utils.private_download_url(
        securedResource.storageReference,
        format,
        {
            resource_type: securedResource.storageResourceType,
            type: securedResource.storageAccess.toLowerCase(),
            expires_at: expiresAt,
            attachment: true
        }
    );

    return { url, expiresAt };
}

export async function reorderResourcesService(instructorId, topicId, resourceIds) {
    const { course } = await getOwnedTopicAndCourse(instructorId, topicId);

    assertCourseNotArchived(course);

    const existingResources = await Resource.find({ topicId });

    const existingIds = new Set(existingResources.map((resource) => resource._id.toString()));
    const requestedIds = new Set(resourceIds.map((id) => id.toString()));

    const isExactMatch =
        resourceIds.length === existingResources.length &&
        requestedIds.size === resourceIds.length &&
        [...requestedIds].every((id) => existingIds.has(id));

    if (!isExactMatch) {
        throw new ApiError(
            400,
            "INVALID_RESOURCE_ORDER",
            "Resource IDs must exactly match the resources in this topic"
        );
    }

    const maxExistingOrder = existingResources.reduce(
        (max, resource) => Math.max(max, resource.order),
        0
    );

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await Resource.bulkWrite(
                resourceIds.map((id, index) => ({
                    updateOne: {
                        filter: { _id: id, topicId },
                        update: { $set: { order: maxExistingOrder + index + 1 } }
                    }
                })),
                { session }
            );

            await Resource.bulkWrite(
                resourceIds.map((id, index) => ({
                    updateOne: {
                        filter: { _id: id, topicId },
                        update: { $set: { order: index + 1 } }
                    }
                })),
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return Resource.find({ topicId }).sort({ order: 1 });
}

export async function archiveResourceService(instructorId, resourceId) {
    const { resource, course } = await getOwnedResourceContext(instructorId, resourceId);

    assertCourseNotArchived(course);

    if (resource.status === "ARCHIVED") {
        throw new ApiError(409, "RESOURCE_ALREADY_ARCHIVED", "Resource is already archived");
    }

    resource.status = "ARCHIVED";
    await resource.save();

    return resource;
}

export async function restoreResourceService(instructorId, resourceId) {
    const { resource, course } = await getOwnedResourceContext(instructorId, resourceId);

    assertCourseNotArchived(course);

    if (resource.status === "ACTIVE") {
        throw new ApiError(409, "RESOURCE_ALREADY_ACTIVE", "Resource is already active");
    }

    resource.status = "ACTIVE";
    await resource.save();

    return resource;
}