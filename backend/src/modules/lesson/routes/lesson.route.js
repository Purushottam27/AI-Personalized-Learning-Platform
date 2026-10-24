import {Router} from 'express'
import { roleMiddleware } from '../../../middleware/role.middleware.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'
import { validateLesson, validateLessonId, validateLessonReorder, validateLessonUpdates } from '../validations/lesson.validation.middleware.js'
import { createLesson, deleteLesson, getLessonById, getLessonsByTopic, reorderLessons, updateLesson } from '../controllers/lesson.controller.js'
import { validateTopicId } from '../../topic/validations/topic.validation.middleware.js'

const lessonRouter = Router()

lessonRouter.route('/topics/:topicId/lessons')
    .post(authMiddleware, roleMiddleware("INSTRUCTOR"), validateTopicId, validateLesson, createLesson)
    .get(authMiddleware, roleMiddleware("INSTRUCTOR"), validateTopicId, getLessonsByTopic)

lessonRouter.route('/lessons/:lessonId')
    .get(authMiddleware, roleMiddleware("INSTRUCTOR"), validateLessonId, getLessonById)
    .patch(authMiddleware, roleMiddleware("INSTRUCTOR"), validateLessonUpdates, updateLesson)
    .delete(authMiddleware, roleMiddleware("INSTRUCTOR"), validateLessonId, deleteLesson)

lessonRouter.patch('/topics/:topicId/lessons/reorder', authMiddleware, roleMiddleware("INSTRUCTOR"), validateLessonReorder, reorderLessons)

export {lessonRouter}