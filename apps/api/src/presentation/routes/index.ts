import { Router } from 'express';

import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { rentalRequestRouter } from './rental-request.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { reportingRouter } from './reporting.routes.js';
import { administrationRouter } from './administration.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/rental-requests', rentalRequestRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportingRouter);
apiRouter.use(administrationRouter);
