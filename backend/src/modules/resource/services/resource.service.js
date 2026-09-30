import mongoose from "mongoose";
import path from "path";

import { Resource } from "../models/resource.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";

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
            resource_type: resourceType ?? "raw"
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

    const cloudinaryResponse = await uploadOnCloudinary(file.path);

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

export async function getResourcesByTopicService(instructorId, topicId) {
    await getOwnedTopicAndCourse(instructorId, topicId);

    const resources = await Resource.find({ topicId }).sort({ order: 1 });

    return resources;
}

export async function getResourceByIdService(instructorId, resourceId) {
    const { resource } = await getOwnedResourceContext(instructorId, resourceId);

    return resource;
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