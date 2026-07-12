import type { RequestHandler } from 'express';

import { RoomService } from '../../services/rooms/room.service.js';
import type {
  createBedSchema,
  createRoomSchema,
  listRoomsSchema,
  roomAssetsSchema,
  roomServicesSchema,
  updateBedSchema,
  updateRoomSchema,
} from '../validators/room.validator.js';
import type { z } from 'zod';

const roomService = new RoomService();

type ListInput = z.infer<typeof listRoomsSchema>;
type CreateRoomInput = z.infer<typeof createRoomSchema>;
type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
type CreateBedInput = z.infer<typeof createBedSchema>;
type UpdateBedInput = z.infer<typeof updateBedSchema>;
type RoomServicesInput = z.infer<typeof roomServicesSchema>;
type RoomAssetsInput = z.infer<typeof roomAssetsSchema>;

function pathParam(
  request: Parameters<RequestHandler>[0],
  name: string,
): string {
  return request.validatedParams![name]!;
}

export const listRooms: RequestHandler = async (request, response, next) => {
  try {
    const result = await roomService.list(
      request.currentUser!,
      request.validatedQuery as ListInput,
    );
    response.status(200).json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / result.pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRoom: RequestHandler = async (request, response, next) => {
  try {
    const room = await roomService.get(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response.status(200).json({ success: true, data: room, meta: null });
  } catch (error) {
    next(error);
  }
};

export const getRoomAvailability: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const availability = await roomService.availability(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response
      .status(200)
      .json({ success: true, data: availability, meta: null });
  } catch (error) {
    next(error);
  }
};

export const createRoom: RequestHandler = async (request, response, next) => {
  try {
    const room = await roomService.create(
      request.currentUser!,
      request.validatedBody as CreateRoomInput,
    );
    response.status(201).json({ success: true, data: room, meta: null });
  } catch (error) {
    next(error);
  }
};

export const updateRoom: RequestHandler = async (request, response, next) => {
  try {
    const room = await roomService.update(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as UpdateRoomInput,
    );
    response.status(200).json({ success: true, data: room, meta: null });
  } catch (error) {
    next(error);
  }
};

export const addBed: RequestHandler = async (request, response, next) => {
  try {
    const bed = await roomService.addBed(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as CreateBedInput,
    );
    response.status(201).json({ success: true, data: bed, meta: null });
  } catch (error) {
    next(error);
  }
};

export const updateBed: RequestHandler = async (request, response, next) => {
  try {
    const bed = await roomService.updateBed(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as UpdateBedInput,
    );
    response.status(200).json({ success: true, data: bed, meta: null });
  } catch (error) {
    next(error);
  }
};

export const listServices: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const services = await roomService.listServices();
    response.status(200).json({ success: true, data: services, meta: null });
  } catch (error) {
    next(error);
  }
};

export const listAssetTypes: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const assetTypes = await roomService.listAssetTypes();
    response.status(200).json({ success: true, data: assetTypes, meta: null });
  } catch (error) {
    next(error);
  }
};

export const getRoomAssets: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const assets = await roomService.getAssets(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response.status(200).json({ success: true, data: assets, meta: null });
  } catch (error) {
    next(error);
  }
};

export const putRoomServices: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const services = await roomService.replaceServices(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as RoomServicesInput,
    );
    response.status(200).json({ success: true, data: services, meta: null });
  } catch (error) {
    next(error);
  }
};

export const putRoomAssets: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const assets = await roomService.replaceAssets(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as RoomAssetsInput,
    );
    response.status(200).json({ success: true, data: assets, meta: null });
  } catch (error) {
    next(error);
  }
};
