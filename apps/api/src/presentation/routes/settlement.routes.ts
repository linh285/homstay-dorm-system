import { Router } from 'express';

import {
  calculateSettlement,
  completeCheckout,
  confirmLiquidation,
  confirmNoBalance,
  customerAgreed,
  finalizeSettlement,
  getSettlement,
  putDeductions,
  recordAdditionalPayment,
  recordRefund,
  returnToAccountant,
  settlementDisputed,
} from '../controllers/settlement.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateAdditionalPayment,
  validateDeductions,
  validateDisputed,
  validateLiquidation,
  validateRefund,
  validateSettlementId,
} from '../validators/settlement.validator.js';

const accountant = requireRoles('ACCOUNTANT');
const manager = requireRoles('MANAGER');

export const settlementRouter = Router();
settlementRouter.use(authenticate);

settlementRouter.get(
  '/:id',
  requireRoles('ACCOUNTANT', 'MANAGER'),
  validateSettlementId,
  getSettlement,
);
settlementRouter.put(
  '/:id/deductions',
  accountant,
  validateSettlementId,
  validateDeductions,
  putDeductions,
);
settlementRouter.post(
  '/:id/calculate',
  accountant,
  validateSettlementId,
  calculateSettlement,
);
settlementRouter.post(
  '/:id/finalize',
  accountant,
  validateSettlementId,
  finalizeSettlement,
);
settlementRouter.post(
  '/:id/customer-agreed',
  manager,
  validateSettlementId,
  customerAgreed,
);
settlementRouter.post(
  '/:id/disputed',
  manager,
  validateSettlementId,
  validateDisputed,
  settlementDisputed,
);
settlementRouter.post(
  '/:id/return-to-accountant',
  manager,
  validateSettlementId,
  returnToAccountant,
);
settlementRouter.post(
  '/:id/record-additional-payment',
  accountant,
  validateSettlementId,
  validateAdditionalPayment,
  recordAdditionalPayment,
);
settlementRouter.post(
  '/:id/record-refund',
  accountant,
  validateSettlementId,
  validateRefund,
  recordRefund,
);
settlementRouter.post(
  '/:id/confirm-no-balance',
  accountant,
  validateSettlementId,
  confirmNoBalance,
);
settlementRouter.post(
  '/:id/confirm-liquidation',
  manager,
  validateSettlementId,
  validateLiquidation,
  confirmLiquidation,
);
settlementRouter.post(
  '/:id/complete-checkout',
  manager,
  validateSettlementId,
  completeCheckout,
);
