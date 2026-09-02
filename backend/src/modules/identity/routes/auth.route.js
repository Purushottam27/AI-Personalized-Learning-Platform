import express from 'express'
import { validateLogin, validateSignup } from '../validations/auth.validation.middleware.js'
import upload from '../../../middleware/upload.middleware.js'
import { loginUser, registerUser } from '../controllers/auth.controller.js'

const authRouter = express.Router()

// Authentication Routes:
// POST /auth/signup
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout
// GET  /auth/me

authRouter.post('/signup',upload.single("avatar"),validateSignup,registerUser)

authRouter.post('/login',validateLogin,loginUser)

authRouter.post('/refresh')

authRouter.post('/logout')

authRouter.get('/me')


export {authRouter}