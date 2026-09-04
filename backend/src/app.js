import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http';
import pino from 'pino';
import errorMiddleware from './middleware/error.middleware.js';
import { authRouter } from './modules/identity/routes/auth.route.js';

import { userRouter } from './modules/users/routes/user.route.js';

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

// Global Error-handling response Middleware
app.use(errorMiddleware);

export default app;
