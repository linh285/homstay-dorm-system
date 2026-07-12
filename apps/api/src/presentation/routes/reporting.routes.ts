import { Router } from 'express';
import {
  branchSummary,
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
