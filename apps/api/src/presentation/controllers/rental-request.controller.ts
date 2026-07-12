import type { RequestHandler } from 'express';

import { RentalRequestService } from '../../services/rental-requests/rental-request.service.js';
import type {
  createRentalRequestSchema,
  listRentalRequestsSchema,
  memberSchema,
  updateRentalRequestSchema,
} from '../validators/rental-request.validator.js';
import type { z } from 'zod';

const rentalRequestService = new RentalRequestService();

type CreateInput = z.infer<typeof createRentalRequestSchema>;
type UpdateInput = z.infer<typeof updateRentalRequestSchema>;
type MemberInput = z.infer<typeof memberSchema>;
type ListInput = z.infer<typeof listRentalRequestsSchema>;

function pathParam(
  request: Parameters<RequestHandler>[0],
  name: string,
): string {
  return request.validatedParams![name]!;
}

export const listRentalRequests: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await rentalRequestService.list(
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

export const createRentalRequest: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const rentalRequest = await rentalRequestService.create(
      request.currentUser!,
      request.validatedBody as CreateInput,
    );
    response
      .status(201)
      .json({ success: true, data: rentalRequest, meta: null });
  } catch (error) {
    next(error);
  }
};

export const getRentalRequest: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const rentalRequest = await rentalRequestService.get(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response
      .status(200)
      .json({ success: true, data: rentalRequest, meta: null });
  } catch (error) {
    next(error);
  }
};

export const updateRentalRequest: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const rentalRequest = await rentalRequestService.update(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as UpdateInput,
    );
    response
      .status(200)
      .json({ success: true, data: rentalRequest, meta: null });
  } catch (error) {
    next(error);
  }
};

export const addMember: RequestHandler = async (request, response, next) => {
  try {
    const member = await rentalRequestService.addMember(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as MemberInput,
    );
    response.status(201).json({ success: true, data: member, meta: null });
  } catch (error) {
    next(error);
  }
};

export const updateMember: RequestHandler = async (request, response, next) => {
  try {
    const member = await rentalRequestService.updateMember(
      request.currentUser!,
      pathParam(request, 'id'),
      pathParam(request, 'memberId'),
      request.validatedBody as MemberInput,
    );
    response.status(200).json({ success: true, data: member, meta: null });
  } catch (error) {
    next(error);
  }
};

export const deleteMember: RequestHandler = async (request, response, next) => {
  try {
    await rentalRequestService.deleteMember(
      request.currentUser!,
      pathParam(request, 'id'),
      pathParam(request, 'memberId'),
    );
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const closeRentalRequest: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const rentalRequest = await rentalRequestService.close(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response
      .status(200)
      .json({ success: true, data: rentalRequest, meta: null });
  } catch (error) {
    next(error);
  }
};
