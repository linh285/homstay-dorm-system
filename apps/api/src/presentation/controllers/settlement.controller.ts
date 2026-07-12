import type { RequestHandler } from 'express';

import { SettlementService } from '../../services/settlements/settlement.service.js';
import type {
  additionalPaymentSchema,
  deductionsSchema,
  disputedSchema,
  liquidationSchema,
  refundSchema,
} from '../validators/settlement.validator.js';
import type { z } from 'zod';

const settlementService = new SettlementService();

type DeductionsInput = z.infer<typeof deductionsSchema>;
type DisputedInput = z.infer<typeof disputedSchema>;
type AdditionalPaymentInput = z.infer<typeof additionalPaymentSchema>;
type RefundInput = z.infer<typeof refundSchema>;
type LiquidationInput = z.infer<typeof liquidationSchema>;

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

export const createSettlement: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    send(
      response,
      await settlementService.createForCheckout(
        request.currentUser!,
        pathParam(request, 'id'),
      ),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const getSettlement: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    send(
      response,
      await settlementService.get(
        request.currentUser!,
        pathParam(request, 'id'),
      ),
    );
  } catch (error) {
    next(error);
  }
};

function actionHandler(
  action: (
    user: Parameters<SettlementService['calculate']>[0],
    request: Parameters<RequestHandler>[0],
  ) => Promise<unknown>,
): RequestHandler {
  return async (request, response, next) => {
    try {
      send(response, await action(request.currentUser!, request));
    } catch (error) {
      next(error);
    }
  };
}

export const putDeductions = actionHandler((user, request) =>
  settlementService.replaceDeductions(
    user,
    pathParam(request, 'id'),
    request.validatedBody as DeductionsInput,
  ),
);
export const calculateSettlement = actionHandler((user, request) =>
  settlementService.calculate(user, pathParam(request, 'id')),
);
export const finalizeSettlement = actionHandler((user, request) =>
  settlementService.finalize(user, pathParam(request, 'id')),
);
export const customerAgreed = actionHandler((user, request) =>
  settlementService.customerAgreed(user, pathParam(request, 'id')),
);
export const settlementDisputed = actionHandler((user, request) =>
  settlementService.disputed(
    user,
    pathParam(request, 'id'),
    request.validatedBody as DisputedInput,
  ),
);
export const returnToAccountant = actionHandler((user, request) =>
  settlementService.returnToAccountant(user, pathParam(request, 'id')),
);
export const recordAdditionalPayment = actionHandler((user, request) =>
  settlementService.recordAdditionalPayment(
    user,
    pathParam(request, 'id'),
    request.validatedBody as AdditionalPaymentInput,
  ),
);
export const recordRefund = actionHandler((user, request) =>
  settlementService.recordRefund(
    user,
    pathParam(request, 'id'),
    request.validatedBody as RefundInput,
  ),
);
export const confirmNoBalance = actionHandler((user, request) =>
  settlementService.confirmNoBalance(user, pathParam(request, 'id')),
);
export const confirmLiquidation = actionHandler((user, request) =>
  settlementService.confirmLiquidation(
    user,
    pathParam(request, 'id'),
    request.validatedBody as LiquidationInput,
  ),
);
export const completeCheckout = actionHandler((user, request) =>
  settlementService.completeCheckout(user, pathParam(request, 'id')),
);
