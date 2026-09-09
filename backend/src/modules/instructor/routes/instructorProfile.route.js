import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../../middleware/role.middleware.js';
import { getInstructorProfile, updateInstructorProfile, updateInstructorOnboarding } from '../controllers/instructorProfile.controller.js';
import { validateUpdateInstructorProfile, validateInstructorOnboarding } from '../validations/instructorProfile.validation.middleware.js';

const instructorRouter = Router();

instructorRouter.use(authMiddleware);
instructorRouter.use(roleMiddleware('INSTRUCTOR'));

instructorRouter.get('/me', getInstructorProfile);
instructorRouter.patch('/me', validateUpdateInstructorProfile, updateInstructorProfile);
instructorRouter.patch('/me/onboarding', validateInstructorOnboarding, updateInstructorOnboarding);

export { instructorRouter };