import { Router } from 'express'
import { roleMiddleware } from '../../../middleware/role.middleware.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'
import { validateCourse, validateCourseId, validateCourseQuery, validateUpdatedCourse } from '../validations/course.validation.middleware.js'
import { archiveCourse, createCourse, discoverCourses, getCourseById, getInstructorCourses, publishCourse, updateCourse } from '../controllers/course.controller.js'

const courseRouter = Router()

courseRouter.use(authMiddleware)

// Instructor course management
courseRouter.get("/instructor/courses",roleMiddleware("INSTRUCTOR"),getInstructorCourses);

courseRouter.post('/',roleMiddleware('INSTRUCTOR'),validateCourse,createCourse)

// Learner course discovery
courseRouter.get('/',roleMiddleware('LEARNER'),validateCourseQuery,discoverCourses)


courseRouter.get('/:courseId',validateCourseId,getCourseById)

courseRouter.patch('/:courseId',roleMiddleware('INSTRUCTOR'),validateUpdatedCourse,updateCourse)

courseRouter.post('/:courseId/publish',roleMiddleware('INSTRUCTOR'),validateCourseId,publishCourse)

courseRouter.post('/:courseId/archive',roleMiddleware('INSTRUCTOR'),validateCourseId,archiveCourse)



export {courseRouter}