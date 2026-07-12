import type { RequestHandler } from 'express';

import { HandoverService } from '../../services/handovers/handover.service.js';
import type {
  createHandoverSchema,
  handoverAssetsSchema,
  updateHandoverSchema,
} from '../validators/handover.validator.js';
import type { z } from 'zod';

const handoverService = new HandoverService();

type CreateInput = z.infer<typeof createHandoverSchema>;
type UpdateInput = z.infer<typeof updateHandoverSchema>;
type AssetsInput = z.infer<typeof handoverAssetsSchema>;

function pathParam(
  request: Parameters<RequestHandler>[0],
  name: string,
): string {
  return request.validatedParams![name]!;
}

function send(
  response: Parameters<RequestHandler>[1],
  data: unknown,
  status = 200,
) {
  response.status(status).json({ success: true, data, meta: null });
}

export const getHandover: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      await handoverService.get(request.currentUser!, pathParam(request, 'id')),
    );
  } catch (error) {
    next(error);
  }
};

export const createHandover: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const handover = await handoverService.createForContract(
      request.currentUser!,
      pathParam(request, 'contractId'),
      request.validatedBody as CreateInput,
    );
    send(response, handover, 201);
  } catch (error) {
    next(error);
  }
};

export const updateHandover: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    send(
      response,
      await handoverService.update(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as UpdateInput,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const putHandoverAssets: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    send(
      response,
      await handoverService.replaceAssets(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as AssetsInput,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const completeHandover: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    send(
      response,
      await handoverService.complete(
        request.currentUser!,
        pathParam(request, 'id'),
      ),
    );
  } catch (error) {
    next(error);
  }
};
