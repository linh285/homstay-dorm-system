import { Router } from 'express';

import {
  cancelCheckout,
  completeInspection,
  createCheckout,
  createInspection,
  getCheckout,
  getInspection,
  listCheckouts,
  putInspectionItems,
  submitCheckout,
  updateCheckout,
  updateInspection,
} from '../controllers/checkout.controller.js';
import { createSettlement } from '../controllers/settlement.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateCheckoutId,
  validateCreateCheckout,
  validateCreateInspection,
  validateInspectionItems,
  validateInspectionUpdate,
  validateListCheckouts,
  validateUpdateCheckout,
} from '../validators/checkout.validator.js';
import { validateSettlementId } from '../validators/settlement.validator.js';

const staff = requireRoles('SALE', 'ACCOUNTANT', 'MANAGER');

export const checkoutRouter = Router();
checkoutRouter.use(authenticate);

checkoutRouter.get('/', staff, validateListCheckouts, listCheckouts);
checkoutRouter.post('/', requireRoles('SALE'), validateCreateCheckout, createCheckout);
checkoutRouter.get('/:id', staff, validateCheckoutId, getCheckout);
checkoutRouter.patch('/:id', requireRoles('SALE'), validateCheckoutId, validateUpdateCheckout, updateCheckout);
checkoutRouter.post('/:id/submit', requireRoles('SALE'), validateCheckoutId, submitCheckout);
checkoutRouter.post('/:id/cancel', requireRoles('SALE'), validateCheckoutId, cancelCheckout);
checkoutRouter.post(
  '/:id/inspection',
  requireRoles('MANAGER'),
  validateCheckoutId,
  validateCreateInspection,
  createInspection,
);
checkoutRouter.post(
  '/:id/settlement',
  requireRoles('ACCOUNTANT'),
  validateCheckoutId,
  createSettlement,
);

export const inspectionRouter = Router();
inspectionRouter.use(authenticate);
inspectionRouter.get(
  '/:id',
  requireRoles('MANAGER', 'ACCOUNTANT'),
  validateSettlementId,
  getInspection,
);
inspectionRouter.patch(
  '/:id',
  requireRoles('MANAGER'),
  validateSettlementId,
  validateInspectionUpdate,
  updateInspection,
);
inspectionRouter.put(
  '/:id/items',
  requireRoles('MANAGER'),
  validateSettlementId,
  validateInspectionItems,
  putInspectionItems,
);
inspectionRouter.post(
  '/:id/complete',
  requireRoles('MANAGER'),
  validateSettlementId,
  completeInspection,
);
