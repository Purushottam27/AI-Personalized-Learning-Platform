import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http';
import pino from 'pino';
import errorMiddleware from './middleware/error.middleware.js';
import { authRouter } from './modules/identity/routes/auth.route.js';

import { userRouter } from './modules/users/routes/user.route.js';
import { learnerRouter } from './modules/learner/routes/learnerProfile.route.js';
import { instructorRouter } from './modules/instructor/routes/instructorProfile.route.js';
import { courseRouter } from './modules/course/routes/course.route.js';
import { topicRouter } from './modules/topic/routes/topic.route.js';
import { enrollmentRouter } from './modules/enrollment/routes/enrollment.route.js';
import { lessonRouter } from './modules/lesson/routes/lesson.route.js';
import { resourceRouter } from './modules/resource/routes/resource.route.js';

const app = express();
const logger = pino();

// Security Middleware Foundation
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(cookieParser())

// Logging Foundation
app.use(pinoHttp({ logger }));
app.use(express.json());

// Minimal Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth',authRouter) 
app.use('/api/v1/users', userRouter);
app.use('/api/v1/learner-profile',learnerRouter);
app.use('/api/v1/instructor-profile',instructorRouter);
app.use('/api/v1/courses',courseRouter)
app.use('/api/v1',topicRouter)
app.use('/api/v1',enrollmentRouter)
app.use('/api/v1',lessonRouter)
app.use('/api/v1',resourceRouter)

// Global Error-handling response Middleware
app.use(errorMiddleware);

export default app;
