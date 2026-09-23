import {Router} from 'express'
import { roleMiddleware } from '../../../middleware/role.middleware.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'
import { validateCourseId } from '../../course/validations/course.validation.middleware.js';

import { createTopic, getTopicById, getTopicsByCourse, reorderTopics, updateTopic } from '../controllers/topic.controller.js';
import { validateTopic, validateTopicId, validateTopicReorder, validateTopicUpdates } from '../validations/topic.validation.middleware.js';

const topicRouter = Router()

topicRouter.use(authMiddleware);

topicRouter.post(
    "/courses/:courseId/topics",
    roleMiddleware("INSTRUCTOR"),
    validateCourseId,
    validateTopic,
    createTopic
);

topicRouter.get(
    "/courses/:courseId/topics",
    roleMiddleware("INSTRUCTOR"),
    validateCourseId,
    getTopicsByCourse
);

topicRouter.patch(
    "/courses/:courseId/topics/reorder",
    roleMiddleware("INSTRUCTOR"),
    validateTopicReorder,
    reorderTopics
);

topicRouter.get(
    "/topics/:topicId",
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    getTopicById
);

topicRouter.patch(
    "/topics/:topicId",
    roleMiddleware("INSTRUCTOR"),
    validateTopicUpdates,
    updateTopic
);



export {topicRouter}