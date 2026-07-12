import { Router } from 'express';

import {
  getBranch,
  listBranches,
  listEmployees,
  updateBranch,
} from '../controllers/administration.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateBranchId,
  validateBranchUpdate,
} from '../validators/administration.validator.js';

export const administrationRouter = Router();
administrationRouter.get(
  '/employees',
  authenticate,
  requireRoles('ADMIN'),
  listEmployees,
);
administrationRouter.get(
  '/branches',
  authenticate,
  requireRoles('ADMIN'),
  listBranches,
);
administrationRouter.get(
  '/branches/:id',
  authenticate,
  requireRoles('ADMIN'),
  validateBranchId,
  getBranch,
);
administrationRouter.patch(
  '/branches/:id',
  authenticate,
  requireRoles('ADMIN'),
  validateBranchId,
  validateBranchUpdate,
  updateBranch,
);
