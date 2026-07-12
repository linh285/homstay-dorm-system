import { Router } from 'express';

import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { rentalRequestRouter } from './rental-request.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/rental-requests', rentalRequestRouter);
