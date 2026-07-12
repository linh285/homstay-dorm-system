import { Router } from 'express';

import {
  cancelViewing,
  confirmViewing,
  confirmVisited,
  createViewing,
  getViewing,
  listViewings,
  noShowViewing,
  recordResult,
  rescheduleViewing,
  updateViewing,
} from '../controllers/viewing.controller.js';
import { createDepositFromViewing } from '../controllers/deposit.controller.js';
import {
  validateCreateDeposit,
  validateViewingId as validateDepositViewingId,
} from '../validators/deposit.validator.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateCancel,
  validateConfirmVisited,
  validateCreateViewing,
  validateListViewings,
  validateNoShow,
  validateReschedule,
  validateResult,
  validateUpdateViewing,
  validateViewingId,
} from '../validators/viewing.validator.js';

export const viewingRouter = Router();
viewingRouter.use(authenticate, requireRoles('SALE'));

viewingRouter.get('/', validateListViewings, listViewings);
viewingRouter.post('/', validateCreateViewing, createViewing);
viewingRouter.get('/:id', validateViewingId, getViewing);
viewingRouter.patch(
  '/:id',
  validateViewingId,
  validateUpdateViewing,
  updateViewing,
);
viewingRouter.post('/:id/confirm', validateViewingId, confirmViewing);
viewingRouter.post(
  '/:id/reschedule',
  validateViewingId,
  validateReschedule,
  rescheduleViewing,
);
viewingRouter.post(
  '/:id/cancel',
  validateViewingId,
  validateCancel,
  cancelViewing,
);
viewingRouter.post(
  '/:id/no-show',
  validateViewingId,
  validateNoShow,
  noShowViewing,
);
viewingRouter.post(
  '/:id/confirm-visited',
  validateViewingId,
  validateConfirmVisited,
  confirmVisited,
);
viewingRouter.post(
  '/:id/result',
  validateViewingId,
  validateResult,
  recordResult,
);
viewingRouter.post(
  '/:id/create-deposit',
  validateDepositViewingId,
  validateCreateDeposit,
  createDepositFromViewing,
);
