import { Router } from 'express';
import {
  branchSummary,
  checkInsCheckouts,
  deposits,
  financialSummary,
  occupancy,
  rentalFunnel,
  systemSummary,
} from '../controllers/reporting.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { validateReportQuery } from '../validators/reporting.validator.js';

export const reportingRouter = Router();
reportingRouter.get(
  '/branch-summary',
  authenticate,
  requireRoles('MANAGER'),
  branchSummary,
);
reportingRouter.get(
  '/system-summary',
  authenticate,
  requireRoles('ADMIN'),
  systemSummary,
);
reportingRouter.get(
  '/occupancy',
  authenticate,
  requireRoles('MANAGER', 'ADMIN'),
  validateReportQuery,
  occupancy,
);
reportingRouter.get(
  '/rental-funnel',
  authenticate,
  requireRoles('MANAGER', 'ADMIN'),
  validateReportQuery,
  rentalFunnel,
);
reportingRouter.get(
  '/deposits',
  authenticate,
  requireRoles('MANAGER', 'ADMIN'),
  validateReportQuery,
  deposits,
);
reportingRouter.get(
  '/check-ins-checkouts',
  authenticate,
  requireRoles('MANAGER', 'ADMIN'),
  validateReportQuery,
  checkInsCheckouts,
);
reportingRouter.get(
  '/financial-summary',
  authenticate,
  requireRoles('MANAGER', 'ADMIN'),
  validateReportQuery,
  financialSummary,
);
