import type { RequestHandler } from 'express';

import { DepositService } from '../../services/deposits/deposit.service.js';
import type {
  confirmCustomerRulesSchema,
  createDepositSchema,
  listDepositsSchema,
  reasonSchema,
  recordPaymentSchema,
  scheduleCheckInSchema,
} from '../validators/deposit.validator.js';
import type { z } from 'zod';

const depositService = new DepositService();

type CreateInput = z.infer<typeof createDepositSchema>;
type ConfirmRulesInput = z.infer<typeof confirmCustomerRulesSchema>;
type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
type ReasonInput = z.infer<typeof reasonSchema>;
type ScheduleCheckInInput = z.infer<typeof scheduleCheckInSchema>;
type ListInput = z.infer<typeof listDepositsSchema>;

function pathParam(
  request: Parameters<RequestHandler>[0],
  name: string,
): string {
  return request.validatedParams![name]!;
}

export const listDeposits: RequestHandler = async (request, response, next) => {
  try {
    const result = await depositService.list(
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

export const getDeposit: RequestHandler = async (request, response, next) => {
  try {
    const deposit = await depositService.get(
      request.currentUser!,
      pathParam(request, 'id'),
    );
    response.status(200).json({ success: true, data: deposit, meta: null });
  } catch (error) {
    next(error);
  }
};

export const createDepositFromViewing: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const deposit = await depositService.createFromViewing(
      request.currentUser!,
      pathParam(request, 'id'),
      request.validatedBody as CreateInput,
    );
    response.status(201).json({ success: true, data: deposit, meta: null });
  } catch (error) {
    next(error);
  }
};

function actionHandler(
  action: (
    user: Parameters<DepositService['approveRoom']>[0],
    id: string,
    body: unknown,
  ) => Promise<unknown>,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const deposit = await action(
        request.currentUser!,
        pathParam(request, 'id'),
        request.validatedBody,
      );
      response.status(200).json({ success: true, data: deposit, meta: null });
    } catch (error) {
      next(error);
    }
  };
}

export const confirmCustomerRules = actionHandler((user, id, body) =>
  depositService.confirmCustomerRules(user, id, body as ConfirmRulesInput),
);
export const submitRoomCheck = actionHandler((user, id) =>
  depositService.submitRoomCheck(user, id),
);
export const approveRoom = actionHandler((user, id) =>
  depositService.approveRoom(user, id),
);
export const rejectRoom = actionHandler((user, id, body) =>
  depositService.rejectRoom(user, id, body as ReasonInput),
);
export const issuePaymentRequest = actionHandler((user, id) =>
  depositService.issuePaymentRequest(user, id),
);
export const recordPayment = actionHandler((user, id, body) =>
  depositService.recordPayment(user, id, body as RecordPaymentInput),
);
export const approvePayment = actionHandler((user, id) =>
  depositService.approvePayment(user, id),
);
export const requestPaymentRecheck = actionHandler((user, id, body) =>
  depositService.requestPaymentRecheck(user, id, body as ReasonInput),
);
export const rejectPayment = actionHandler((user, id, body) =>
  depositService.rejectPayment(user, id, body as ReasonInput),
);
export const scheduleCheckIn = actionHandler((user, id, body) =>
  depositService.scheduleCheckIn(user, id, body as ScheduleCheckInInput),
);
export const cancelDeposit = actionHandler((user, id) =>
  depositService.cancel(user, id),
);
