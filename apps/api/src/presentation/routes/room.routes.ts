import { Router } from 'express';

import {
  addBed,
  createRoom,
  getRoom,
  getRoomAssets,
  getRoomAvailability,
  listAssetTypes,
  listRooms,
  listServices,
  putRoomAssets,
  putRoomServices,
  updateBed,
  updateRoom,
} from '../controllers/room.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  validateBedId,
  validateCreateBed,
  validateCreateRoom,
  validateListRooms,
  validateRoomAssets,
  validateRoomId,
  validateRoomServices,
  validateUpdateBed,
  validateUpdateRoom,
} from '../validators/room.validator.js';

export const roomRouter = Router();
roomRouter.use(authenticate);

roomRouter.get(
  '/',
  requireRoles('SALE', 'MANAGER', 'ADMIN'),
  validateListRooms,
  listRooms,
);
roomRouter.post('/', requireRoles('MANAGER'), validateCreateRoom, createRoom);
roomRouter.get(
  '/:id',
  requireRoles('SALE', 'MANAGER', 'ADMIN'),
  validateRoomId,
  getRoom,
);
roomRouter.patch(
  '/:id',
  requireRoles('MANAGER'),
  validateRoomId,
  validateUpdateRoom,
  updateRoom,
);
roomRouter.get(
  '/:id/availability',
  requireRoles('SALE', 'MANAGER', 'ADMIN'),
  validateRoomId,
  getRoomAvailability,
);
roomRouter.post(
  '/:id/beds',
  requireRoles('MANAGER'),
  validateRoomId,
  validateCreateBed,
  addBed,
);
roomRouter.get(
  '/:id/assets',
  requireRoles('SALE', 'MANAGER', 'ADMIN'),
  validateRoomId,
  getRoomAssets,
);
roomRouter.put(
  '/:id/assets',
  requireRoles('MANAGER'),
  validateRoomId,
  validateRoomAssets,
  putRoomAssets,
);
roomRouter.put(
  '/:id/services',
  requireRoles('MANAGER'),
  validateRoomId,
  validateRoomServices,
  putRoomServices,
);

export const bedRouter = Router();
bedRouter.use(authenticate);
bedRouter.patch(
  '/:id',
  requireRoles('MANAGER'),
  validateBedId,
  validateUpdateBed,
  updateBed,
);

export const catalogRouter = Router();
catalogRouter.use(authenticate);
catalogRouter.get(
  '/services',
  requireRoles('SALE', 'ACCOUNTANT', 'MANAGER', 'ADMIN'),
  listServices,
);
catalogRouter.get(
  '/asset-types',
  requireRoles('SALE', 'MANAGER', 'ADMIN'),
  listAssetTypes,
);
