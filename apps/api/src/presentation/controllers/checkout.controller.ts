import type { RequestHandler } from 'express';

import { CheckoutService } from '../../services/checkouts/checkout.service.js';
import type {
  createCheckoutSchema,
  createInspectionSchema,
  inspectionItemsSchema,
  inspectionUpdateSchema,
  listCheckoutsSchema,
  updateCheckoutSchema,
} from '../validators/checkout.validator.js';
import type { z } from 'zod';

const checkoutService = new CheckoutService();

type CreateInput = z.infer<typeof createCheckoutSchema>;
type UpdateInput = z.infer<typeof updateCheckoutSchema>;
type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
type InspectionUpdateInput = z.infer<typeof inspectionUpdateSchema>;
type InspectionItemsInput = z.infer<typeof inspectionItemsSchema>;
type ListInput = z.infer<typeof listCheckoutsSchema>;

function pathParam(request: Parameters<RequestHandler>[0], name: string): string {
  return request.validatedParams![name]!;
}
function send(response: Parameters<RequestHandler>[1], data: unknown, status = 200) {
  response.status(status).json({ success: true, data, meta: null });
}

export const listCheckouts: RequestHandler = async (request, response, next) => {
  try {
    const result = await checkoutService.list(
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

export const getCheckout: RequestHandler = async (request, response, next) => {
  try {
    send(response, await checkoutService.get(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};

export const createCheckout: RequestHandler = async (request, response, next) => {
  try {
    const checkout = await checkoutService.create(
      request.currentUser!,
      request.validatedBody as CreateInput,
    );
    send(response, checkout, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCheckout: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      await checkoutService.update(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as UpdateInput,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const submitCheckout: RequestHandler = async (request, response, next) => {
  try {
    send(response, await checkoutService.submit(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};

export const cancelCheckout: RequestHandler = async (request, response, next) => {
  try {
    send(response, await checkoutService.cancel(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};

export const createInspection: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      await checkoutService.createInspection(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as CreateInspectionInput,
      ),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const getInspection: RequestHandler = async (request, response, next) => {
  try {
    send(response, await checkoutService.getInspection(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};

export const updateInspection: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      await checkoutService.updateInspection(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as InspectionUpdateInput,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const putInspectionItems: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      await checkoutService.replaceInspectionItems(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody as InspectionItemsInput,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const completeInspection: RequestHandler = async (request, response, next) => {
  try {
    send(response, await checkoutService.completeInspection(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};
