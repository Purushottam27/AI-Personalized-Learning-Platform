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
    restoreResource
} from "../controllers/resource.controller.js";

const resourceRouter = Router();

resourceRouter.use(authMiddleware);
resourceRouter.use(roleMiddleware("INSTRUCTOR"));

resourceRouter.post(
    "/topics/:topicId/resources",
    validateTopicId,
    resourceUpload,
    validateResource,
    createResource
);

resourceRouter.get(
    "/topics/:topicId/resources",
    validateTopicId,
    getResourcesByTopic
);

resourceRouter.get(
    "/resources/:resourceId",
    validateResourceId,
    getResourceById
);

resourceRouter.patch(
    "/resources/:resourceId",
    validateResourceId,
    validateResourceUpdates,
    updateResource
);

resourceRouter.patch(
    "/topics/:topicId/resources/reorder",
    validateTopicId,
    validateResourceReorder,
    reorderResources
);

resourceRouter.post(
    "/resources/:resourceId/archive",
    validateResourceId,
    archiveResource
);

resourceRouter.post(
    "/resources/:resourceId/restore",
    validateResourceId,
    restoreResource
);

export { resourceRouter };