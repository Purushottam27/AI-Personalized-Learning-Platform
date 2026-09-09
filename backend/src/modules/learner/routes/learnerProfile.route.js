import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../../middleware/role.middleware.js';
import { getLearnerProfile, updateLearnerProfile, updateLearnerOnboarding } from '../controllers/learnerProfile.controller.js';
import { validateUpdateLearnerProfile, validateLearnerOnboarding } from '../validations/learnerProfile.validation.middleware.js';

const learnerRouter = Router();

learnerRouter.use(authMiddleware);
learnerRouter.use(roleMiddleware('LEARNER'));

learnerRouter.get('/me', getLearnerProfile);
learnerRouter.patch('/me', validateUpdateLearnerProfile, updateLearnerProfile);
learnerRouter.patch('/me/onboarding', validateLearnerOnboarding, updateLearnerOnboarding);

export { learnerRouter };