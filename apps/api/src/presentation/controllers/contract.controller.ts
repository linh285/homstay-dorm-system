import type { RequestHandler } from 'express';

import { ContractService } from '../../services/contracts/contract.service.js';
import type {
  confirmArrivalSchema,
  createInitialPaymentSchema,
  listContractsSchema,
  recordInitialPaymentSchema,
  recordPaperContractSchema,
  rejectResidentSchema,
  residentsSchema,
} from '../validators/contract.validator.js';
import type { z } from 'zod';

const contractService = new ContractService();

type ListInput = z.infer<typeof listContractsSchema>;
type ConfirmArrivalInput = z.infer<typeof confirmArrivalSchema>;
type ResidentsInput = z.infer<typeof residentsSchema>;
type RejectResidentInput = z.infer<typeof rejectResidentSchema>;
type RecordPaperContractInput = z.infer<typeof recordPaperContractSchema>;
type CreateInitialPaymentInput = z.infer<typeof createInitialPaymentSchema>;
type RecordInitialPaymentInput = z.infer<typeof recordInitialPaymentSchema>;

function pathParam(request: Parameters<RequestHandler>[0], name: string): string {
  return request.validatedParams![name]!;
}

function send(response: Parameters<RequestHandler>[1], data: unknown, status = 200) {
  response.status(status).json({ success: true, data, meta: null });
}

export const listContracts: RequestHandler = async (request, response, next) => {
  try {
    const result = await contractService.list(
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

export const getContract: RequestHandler = async (request, response, next) => {
  try {
    send(response, await contractService.get(request.currentUser!, pathParam(request, 'id')));
  } catch (error) {
    next(error);
  }
};

export const createContractFromDeposit: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const contract = await contractService.createFromDeposit(
      request.currentUser!,
      pathParam(request, 'depositId'),
    );
    send(response, contract, 201);
  } catch (error) {
    next(error);
  }
};

function actionHandler(
  action: (
    user: Parameters<ContractService['confirmArrival']>[0],
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

export const confirmArrival = actionHandler((user, request) =>
  contractService.confirmArrival(
    user,
    pathParam(request, 'id'),
    request.validatedBody as ConfirmArrivalInput,
  ),
);
export const updateResidents = actionHandler((user, request) =>
  contractService.updateResidents(
    user,
    pathParam(request, 'id'),
    request.validatedBody as ResidentsInput,
  ),
);
export const submitEligibilityReview = actionHandler((user, request) =>
  contractService.submitEligibilityReview(user, pathParam(request, 'id')),
);
export const approveResident = actionHandler((user, request) =>
  contractService.approveResident(
    user,
    pathParam(request, 'id'),
    pathParam(request, 'customerId'),
  ),
);
export const rejectResident = actionHandler((user, request) =>
  contractService.rejectResident(
    user,
    pathParam(request, 'id'),
    pathParam(request, 'customerId'),
    request.validatedBody as RejectResidentInput,
  ),
);
export const approveEligibility = actionHandler((user, request) =>
  contractService.approveEligibility(user, pathParam(request, 'id')),
);
export const stopCheckIn = actionHandler((user, request) =>
  contractService.stopCheckIn(user, pathParam(request, 'id')),
);
export const recordPaperContract = actionHandler((user, request) =>
  contractService.recordPaperContract(
    user,
    pathParam(request, 'id'),
    request.validatedBody as RecordPaperContractInput,
  ),
);
export const confirmPaperSigning = actionHandler((user, request) =>
  contractService.confirmPaperSigning(user, pathParam(request, 'id')),
);
export const createInitialPayment = actionHandler((user, request) =>
  contractService.createInitialPayment(
    user,
    pathParam(request, 'id'),
    request.validatedBody as CreateInitialPaymentInput,
  ),
);
export const recordInitialPayment = actionHandler((user, request) =>
  contractService.recordInitialPayment(
    user,
    pathParam(request, 'id'),
    request.validatedBody as RecordInitialPaymentInput,
  ),
);
export const confirmInitialPayment = actionHandler((user, request) =>
  contractService.confirmInitialPayment(user, pathParam(request, 'id')),
);
export const submitHandover = actionHandler((user, request) =>
  contractService.submitHandover(user, pathParam(request, 'id')),
);
