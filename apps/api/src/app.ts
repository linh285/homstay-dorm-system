import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';

import { env } from './config/env.js';
import { errorMiddleware } from './presentation/middleware/error.middleware.js';
import { notFoundMiddleware } from './presentation/middleware/not-found.middleware.js';
import { apiRouter } from './presentation/routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1', apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
