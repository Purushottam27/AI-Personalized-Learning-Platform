// POST /api/v1/courses/:courseId/enroll
// GET  /api/v1/users/me/enrollments
// GET  /api/v1/enrollments/:enrollmentId
// POST /api/v1/enrollments/:enrollmentId/withdraw

import { Router } from "express";
import { validateCourseId } from "../../course/validations/course.validation.middleware.js";
import { createEnrollment, getEnrollmentById, getMyEnrollments, withdrawEnrollment } from "../controllers/enrollment.controller.js";
import { validateEnrollmentId } from "../validations/enrollment.validation.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";
import { authMiddleware } from "../../../middleware/auth.middleware.js";

const enrollmentRouter = Router();

enrollmentRouter.use(authMiddleware)

enrollmentRouter.post(
    "/courses/:courseId/enroll",
    roleMiddleware('LEARNER'),
    validateCourseId,
    createEnrollment
);

enrollmentRouter.get(
    "/users/me/enrollments",
    roleMiddleware('LEARNER'),
    getMyEnrollments
);

enrollmentRouter.get(
    "/enrollments/:enrollmentId",
    roleMiddleware('LEARNER'),
    validateEnrollmentId,
    getEnrollmentById
);

enrollmentRouter.post(
    "/enrollments/:enrollmentId/withdraw",
    roleMiddleware('LEARNER'),
    validateEnrollmentId,
    withdrawEnrollment
);

export {enrollmentRouter};