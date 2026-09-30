import {
    createResourceService,
    getResourcesByTopicService,
    getResourceByIdService,
    updateResourceService,
    reorderResourcesService,
    archiveResourceService,
    restoreResourceService
} from "../services/resource.service.js";

import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function createResource(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;
    const resourceData = req.body;
    const file = req.file;

    const resource = await createResourceService(instructorId, topicId, resourceData, file);

    res.status(201).json(new ApiResponse(resource, "Resource created successfully"));
}

export async function getResourcesByTopic(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;

    const resources = await getResourcesByTopicService(instructorId, topicId);

    res.status(200).json(new ApiResponse(resources, "Resources fetched successfully"));
}

export async function getResourceById(req, res) {
    const instructorId = req.user._id;
    const { resourceId } = req.params;

    const resource = await getResourceByIdService(instructorId, resourceId);

    res.status(200).json(new ApiResponse(resource, "Resource fetched successfully"));
}

export async function updateResource(req, res) {
    const instructorId = req.user._id;
    const { resourceId } = req.params;
    const updateData = req.body;

    const resource = await updateResourceService(instructorId, resourceId, updateData);

    res.status(200).json(new ApiResponse(resource, "Resource updated successfully"));
}

export async function reorderResources(req, res) {
    const instructorId = req.user._id;
    const { topicId } = req.params;
    const { resourceIds } = req.body;

    const resources = await reorderResourcesService(instructorId, topicId, resourceIds);

    res.status(200).json(new ApiResponse(resources, "Resources reordered successfully"));
}

export async function archiveResource(req, res) {
    const instructorId = req.user._id;
    const { resourceId } = req.params;

    const resource = await archiveResourceService(instructorId, resourceId);

    res.status(200).json(new ApiResponse(resource, "Resource archived successfully"));
}

export async function restoreResource(req, res) {
    const instructorId = req.user._id;
    const { resourceId } = req.params;

    const resource = await restoreResourceService(instructorId, resourceId);

    res.status(200).json(new ApiResponse(resource, "Resource restored successfully"));
}