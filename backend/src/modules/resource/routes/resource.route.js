import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import { validateTopicId } from "../../topic/validations/topic.validation.middleware.js";

import {
    validateResource,
    validateResourceId,
    validateResourceReorder,
    validateResourceUpdates
} from "../validations/resource.validation.middleware.js";

import resourceUpload from "../../../middleware/resourceUpload.middleware.js";

import {
    createResource,
    getResourcesByTopic,
    getResourceById,
    updateResource,
    reorderResources,
    archiveResource,
    restoreResource,
    getResourceDownloadUrl
} from "../controllers/resource.controller.js";

const resourceRouter = Router();

resourceRouter.post(
    "/topics/:topicId/resources",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    resourceUpload,
    validateResource,
    createResource
);

resourceRouter.get(
    "/topics/:topicId/resources",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    getResourcesByTopic
);

resourceRouter.get(
    "/resources/:resourceId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateResourceId,
    getResourceById
);

resourceRouter.get(
    "/resources/:resourceId/file",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateResourceId,
    getResourceDownloadUrl
);

resourceRouter.patch(
    "/resources/:resourceId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateResourceId,
    validateResourceUpdates,
    updateResource
);

resourceRouter.patch(
    "/topics/:topicId/resources/reorder",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    validateResourceReorder,
    reorderResources
);

resourceRouter.post(
    "/resources/:resourceId/archive",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateResourceId,
    archiveResource
);

resourceRouter.post(
    "/resources/:resourceId/restore",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateResourceId,
    restoreResource
);

export { resourceRouter };