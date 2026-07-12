import { Router } from 'express';

import {
  addMember,
  closeRentalRequest,
  createRentalRequest,
  deleteMember,
  getRentalRequest,
  listRentalRequests,
  searchRentalRequestRooms,
  updateMember,
  updateRentalRequest,
} from '../controllers/rental-request.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateCreateRentalRequest,
  validateListRentalRequests,
  validateMember,
  validateMemberIds,
  validateRentalRequestId,
  validateUpdateRentalRequest,
} from '../validators/rental-request.validator.js';

export const rentalRequestRouter = Router();

rentalRequestRouter.use(authenticate, requireRoles('SALE'));
rentalRequestRouter.get('/', validateListRentalRequests, listRentalRequests);
rentalRequestRouter.post('/', validateCreateRentalRequest, createRentalRequest);
rentalRequestRouter.get('/:id', validateRentalRequestId, getRentalRequest);
rentalRequestRouter.post(
  '/:id/search-rooms',
  validateRentalRequestId,
  searchRentalRequestRooms,
);
rentalRequestRouter.patch(
  '/:id',
  validateRentalRequestId,
  validateUpdateRentalRequest,
  updateRentalRequest,
);
rentalRequestRouter.post(
  '/:id/members',
  validateRentalRequestId,
  validateMember,
  addMember,
);
rentalRequestRouter.patch(
  '/:id/members/:memberId',
  validateMemberIds,
  validateMember,
  updateMember,
);
rentalRequestRouter.delete(
  '/:id/members/:memberId',
  validateMemberIds,
  deleteMember,
);
rentalRequestRouter.post(
  '/:id/close',
  validateRentalRequestId,
  closeRentalRequest,
);
