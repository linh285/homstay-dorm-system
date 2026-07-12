import type { RequestHandler } from 'express';

import { ViewingService } from '../../services/viewings/viewing.service.js';
import type {
  cancelSchema,
  confirmVisitedSchema,
  createViewingSchema,
  listViewingsSchema,
  noShowSchema,
  rescheduleSchema,
  resultSchema,
  updateViewingSchema,
} from '../validators/viewing.validator.js';
import type { z } from 'zod';

const viewingService = new ViewingService();

type CreateInput = z.infer<typeof createViewingSchema>;
type UpdateInput = z.infer<typeof updateViewingSchema>;
type RescheduleInput = z.infer<typeof rescheduleSchema>;
type CancelInput = z.infer<typeof cancelSchema>;
type NoShowInput = z.infer<typeof noShowSchema>;
type ConfirmVisitedInput = z.infer<typeof confirmVisitedSchema>;
type ResultInput = z.infer<typeof resultSchema>;
type ListInput = z.infer<typeof listViewingsSchema>;

function pathParam(
  request: Parameters<RequestHandler>[0],
  name: string,
): string {
  return request.validatedParams![name]!;
}

export const listViewings: RequestHandler = async (request, response, next) => {
  try {
    const result = await viewingService.list(
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

export const getViewing: RequestHandler = async (request, response, next) => {
  try {
    const viewing = await viewingService.get(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response.status(200).json({ success: true, data: viewing, meta: null });
  } catch (error) {
    next(error);
  }
};

export const createViewing: RequestHandler = async (request, response, next) => {
  try {
    const viewing = await viewingService.create(
      request.currentUser!,
      request.validatedBody as CreateInput,
    );
    response.status(201).json({ success: true, data: viewing, meta: null });
  } catch (error) {
    next(error);
  }
};

export const updateViewing: RequestHandler = async (request, response, next) => {
  try {
    const viewing = await viewingService.update(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as UpdateInput,
    );
    response.status(200).json({ success: true, data: viewing, meta: null });
  } catch (error) {
    next(error);
  }
};

function actionHandler(
  action: (
    user: Parameters<ViewingService['confirm']>[0],
    id: string,
    body: unknown,
  ) => Promise<unknown>,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const viewing = await action(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody,
      );
      response.status(200).json({ success: true, data: viewing, meta: null });
    } catch (error) {
      next(error);
    }
  };
}

export const confirmViewing = actionHandler((user, id) =>
  viewingService.confirm(user, id),
);
export const rescheduleViewing = actionHandler((user, id, body) =>
  viewingService.reschedule(user, id, body as RescheduleInput),
);
export const cancelViewing = actionHandler((user, id, body) =>
  viewingService.cancel(user, id, body as CancelInput),
);
export const noShowViewing = actionHandler((user, id, body) =>
  viewingService.noShow(user, id, body as NoShowInput),
);
export const confirmVisited = actionHandler((user, id, body) =>
  viewingService.confirmVisited(user, id, body as ConfirmVisitedInput),
);
export const recordResult = actionHandler((user, id, body) =>
  viewingService.recordResult(user, id, body as ResultInput),
);
