import express from 'express'
import { validateChangedPassword, validateLogin, validateSignup } from '../validations/auth.validation.middleware.js'
import upload from '../../../middleware/upload.middleware.js'
import { changePassword, currentUser, loginUser, logoutUser, refresh, registerUser } from '../controllers/auth.controller.js'
import { authMiddleware } from '../../../middleware/auth.middleware.js'

const authRouter = express.Router()

// Authentication Routes:
// POST /auth/signup
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout
// GET  /auth/me
// POST /auth/change-password

authRouter.post('/signup',upload.single("avatar"),validateSignup,registerUser)

authRouter.post('/login',validateLogin,loginUser)

authRouter.post('/refresh',refresh)

authRouter.post('/logout',authMiddleware,logoutUser)

authRouter.get('/me',authMiddleware,currentUser)

authRouter.post('/change-password',authMiddleware,validateChangedPassword,changePassword)

export {authRouter}