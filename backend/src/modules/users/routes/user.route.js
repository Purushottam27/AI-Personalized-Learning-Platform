import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../../middleware/role.middleware.js';
import { getUserById, getUsers, updateUserStatus, updateCurrentUser, deactivateCurrentUser, updateUserAvatar } from '../controllers/user.controller.js';
import { validateUserIdParam, validateUsersQuerySchema, validateUserStatusRequest, validateUpdateCurrentUser } from '../validations/user.validation.middleware.js';
import upload from '../../../middleware/upload.middleware.js';

const userRouter = Router();

userRouter.use(authMiddleware);

// admin routes
userRouter.get('/',roleMiddleware('ADMIN'),validateUsersQuerySchema,getUsers)

// /me routes must come before /:userId to prevent Express from interpreting "me" as a userId
userRouter.patch('/me',validateUpdateCurrentUser,updateCurrentUser)

userRouter.delete('/me',deactivateCurrentUser)

userRouter.patch('/me/avatar',upload.single('avatar'),updateUserAvatar)

userRouter.get('/:userId',roleMiddleware('ADMIN'),validateUserIdParam,getUserById)

userRouter.patch('/:userId/status',roleMiddleware('ADMIN'),validateUserStatusRequest,updateUserStatus)

// PATCH /users/me/email

export { userRouter };
