import {Router} from 'express'
import { roleMiddleware } from '../../../middleware/role.middleware.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'
import { validateCourseId } from '../../course/validations/course.validation.middleware.js';

import { createTopic, getTopicById, getTopicsByCourse, reorderTopics, updateTopic } from '../controllers/topic.controller.js';
import { validateTopic, validateTopicId, validateTopicReorder, validateTopicUpdates } from '../validations/topic.validation.middleware.js';

const topicRouter = Router()

topicRouter.post(
    "/courses/:courseId/topics",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateCourseId,
    validateTopic,
    createTopic
);

topicRouter.get(
    "/courses/:courseId/topics",
    authMiddleware,
    validateCourseId,
    getTopicsByCourse
);

topicRouter.patch(
    "/courses/:courseId/topics/reorder",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicReorder,
    reorderTopics
);

topicRouter.get(
    "/topics/:topicId",
    authMiddleware,
    validateTopicId,
    getTopicById
);

topicRouter.patch(
    "/topics/:topicId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicUpdates,
    updateTopic
);



export {topicRouter}