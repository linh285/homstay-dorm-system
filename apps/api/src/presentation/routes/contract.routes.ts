import { Router } from 'express';

import {
  approveEligibility,
  approveResident,
  confirmArrival,
  confirmInitialPayment,
  confirmPaperSigning,
  createContractFromDeposit,
  createInitialPayment,
  getContract,
  listContracts,
  recordInitialPayment,
  recordPaperContract,
  rejectResident,
  stopCheckIn,
  submitEligibilityReview,
  submitHandover,
  updateResidents,
} from '../controllers/contract.controller.js';
import { createHandover } from '../controllers/handover.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateApproveResident,
  validateConfirmArrival,
  validateConfirmPaperSigning,
  validateContractId,
  validateCreateInitialPayment,
  validateDepositIdParam,
  validateListContracts,
  validateRecordInitialPayment,
  validateRecordPaperContract,
  validateRejectResident,
  validateResidentParams,
  validateResidents,
  validateStopCheckIn,
} from '../validators/contract.validator.js';
import {
  validateCreateHandover,
  validateHandoverContractId,
} from '../validators/handover.validator.js';

const staff = requireRoles('SALE', 'ACCOUNTANT', 'MANAGER');
const sale = requireRoles('SALE');
const manager = requireRoles('MANAGER');
const accountant = requireRoles('ACCOUNTANT');

export const contractRouter = Router();
contractRouter.use(authenticate);

contractRouter.get('/', staff, validateListContracts, listContracts);
contractRouter.post(
  '/from-deposit/:depositId',
  sale,
  validateDepositIdParam,
  createContractFromDeposit,
);
contractRouter.get('/:id', staff, validateContractId, getContract);
contractRouter.post(
  '/:id/confirm-arrival',
  sale,
  validateContractId,
  validateConfirmArrival,
  confirmArrival,
);
contractRouter.put(
  '/:id/residents',
  sale,
  validateContractId,
  validateResidents,
  updateResidents,
);
contractRouter.post(
  '/:id/submit-eligibility-review',
  sale,
  validateContractId,
  submitEligibilityReview,
);
contractRouter.post(
  '/:id/residents/:customerId/approve',
  manager,
  validateResidentParams,
  validateApproveResident,
  approveResident,
);
contractRouter.post(
  '/:id/residents/:customerId/reject',
  manager,
  validateResidentParams,
  validateRejectResident,
  rejectResident,
);
contractRouter.post(
  '/:id/approve-eligibility',
  manager,
  validateContractId,
  approveEligibility,
);
contractRouter.post(
  '/:id/stop-check-in',
  manager,
  validateContractId,
  validateStopCheckIn,
  stopCheckIn,
);
contractRouter.post(
  '/:id/record-paper-contract',
  sale,
  validateContractId,
  validateRecordPaperContract,
  recordPaperContract,
);
contractRouter.post(
  '/:id/confirm-paper-signing',
  sale,
  validateContractId,
  validateConfirmPaperSigning,
  confirmPaperSigning,
);
contractRouter.post(
  '/:id/create-initial-payment',
  accountant,
  validateContractId,
  validateCreateInitialPayment,
  createInitialPayment,
);
contractRouter.post(
  '/:id/record-initial-payment',
  accountant,
  validateContractId,
  validateRecordInitialPayment,
  recordInitialPayment,
);
contractRouter.post(
  '/:id/confirm-initial-payment',
  accountant,
  validateContractId,
  confirmInitialPayment,
);
contractRouter.post(
  '/:id/submit-handover',
  accountant,
  validateContractId,
  submitHandover,
);
contractRouter.post(
  '/:contractId/handovers',
  manager,
  validateHandoverContractId,
  validateCreateHandover,
  createHandover,
);
