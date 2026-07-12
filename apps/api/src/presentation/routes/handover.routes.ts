import { Router } from 'express';

import {
  completeHandover,
  getHandover,
  putHandoverAssets,
  updateHandover,
} from '../controllers/handover.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateHandoverAssets,
  validateHandoverId,
  validateUpdateHandover,
} from '../validators/handover.validator.js';

export const handoverRouter = Router();
handoverRouter.use(authenticate, requireRoles('MANAGER'));

handoverRouter.get('/:id', validateHandoverId, getHandover);
handoverRouter.patch(
  '/:id',
  validateHandoverId,
  validateUpdateHandover,
  updateHandover,
);
handoverRouter.put(
  '/:id/assets',
  validateHandoverId,
  validateHandoverAssets,
  putHandoverAssets,
);
handoverRouter.post('/:id/complete', validateHandoverId, completeHandover);
