import { Router } from 'express';

import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { rentalRequestRouter } from './rental-request.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { reportingRouter } from './reporting.routes.js';
import { administrationRouter } from './administration.routes.js';
import { bedRouter, catalogRouter, roomRouter } from './room.routes.js';
import { viewingRouter } from './viewing.routes.js';
import { depositRouter } from './deposit.routes.js';
import { contractRouter } from './contract.routes.js';
import { handoverRouter } from './handover.routes.js';
import { checkoutRouter, inspectionRouter } from './checkout.routes.js';
import { settlementRouter } from './settlement.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/rental-requests', rentalRequestRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/beds', bedRouter);
apiRouter.use(catalogRouter);
apiRouter.use('/viewings', viewingRouter);
apiRouter.use('/deposits', depositRouter);
apiRouter.use('/contracts', contractRouter);
apiRouter.use('/handovers', handoverRouter);
apiRouter.use('/checkout-requests', checkoutRouter);
apiRouter.use('/checkout-inspections', inspectionRouter);
apiRouter.use('/settlements', settlementRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportingRouter);
apiRouter.use(administrationRouter);
