import { Router } from 'express';

import {
  approvePayment,
  approveRoom,
  cancelDeposit,
  confirmCustomerRules,
  getDeposit,
  issuePaymentRequest,
  listDeposits,
  recordPayment,
  rejectPayment,
  rejectRoom,
  requestPaymentRecheck,
  scheduleCheckIn,
  submitRoomCheck,
} from '../controllers/deposit.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateConfirmCustomerRules,
  validateDepositId,
  validateListDeposits,
  validateReason,
  validateRecordPayment,
  validateRejectRoom,
  validateScheduleCheckIn,
} from '../validators/deposit.validator.js';

export const depositRouter = Router();
depositRouter.use(authenticate);

depositRouter.get(
  '/',
  requireRoles('SALE', 'ACCOUNTANT', 'MANAGER'),
  validateListDeposits,
  listDeposits,
);
depositRouter.get(
  '/:id',
  requireRoles('SALE', 'ACCOUNTANT', 'MANAGER'),
  validateDepositId,
  getDeposit,
);
depositRouter.post(
  '/:id/confirm-customer-rules',
  requireRoles('SALE'),
  validateDepositId,
  validateConfirmCustomerRules,
  confirmCustomerRules,
);
depositRouter.post(
  '/:id/submit-room-check',
  requireRoles('SALE'),
  validateDepositId,
  submitRoomCheck,
);
depositRouter.post(
  '/:id/approve-room',
  requireRoles('MANAGER'),
  validateDepositId,
  approveRoom,
);
depositRouter.post(
  '/:id/reject-room',
  requireRoles('MANAGER'),
  validateDepositId,
  validateRejectRoom,
  rejectRoom,
);
depositRouter.post(
  '/:id/issue-payment-request',
  requireRoles('ACCOUNTANT'),
  validateDepositId,
  issuePaymentRequest,
);
depositRouter.post(
  '/:id/record-payment',
  requireRoles('ACCOUNTANT'),
  validateDepositId,
  validateRecordPayment,
  recordPayment,
);
depositRouter.post(
  '/:id/approve-payment',
  requireRoles('MANAGER'),
  validateDepositId,
  approvePayment,
);
depositRouter.post(
  '/:id/request-payment-recheck',
  requireRoles('MANAGER'),
  validateDepositId,
  validateReason,
  requestPaymentRecheck,
);
depositRouter.post(
  '/:id/reject-payment',
  requireRoles('MANAGER'),
  validateDepositId,
  validateReason,
  rejectPayment,
);
depositRouter.post(
  '/:id/schedule-check-in',
  requireRoles('SALE'),
  validateDepositId,
  validateScheduleCheckIn,
  scheduleCheckIn,
);
depositRouter.post(
  '/:id/cancel',
  requireRoles('SALE'),
  validateDepositId,
  cancelDeposit,
);
