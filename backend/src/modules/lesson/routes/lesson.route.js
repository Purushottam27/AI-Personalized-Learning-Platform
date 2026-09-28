import {Router} from 'express'
import { roleMiddleware } from '../../../middleware/role.middleware.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'
import { validateLesson, validateLessonId, validateLessonReorder, validateLessonUpdates } from '../validations/lesson.validation.middleware.js'
import { createLesson, deleteLesson, getLessonById, getLessonsByTopic, reorderLessons, updateLesson } from '../controllers/lesson.controller.js'
import { validateTopicId } from '../../topic/validations/topic.validation.middleware.js'

const lessonRouter = Router()

lessonRouter.use(authMiddleware)
lessonRouter.use(roleMiddleware("INSTRUCTOR"));

lessonRouter.route('/topics/:topicId/lessons')
    .post(validateTopicId,validateLesson,createLesson)
    .get(validateTopicId,getLessonsByTopic)

lessonRouter.route('/lessons/:lessonId')
    .get(validateLessonId,getLessonById)
    .patch(validateLessonUpdates,updateLesson)
    .delete(validateLessonId,deleteLesson)

lessonRouter.patch('/topics/:topicId/lessons/reorder',validateLessonReorder,reorderLessons)


export {lessonRouter}