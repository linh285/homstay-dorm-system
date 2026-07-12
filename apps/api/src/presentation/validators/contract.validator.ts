import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateTime = z.string().datetime({ offset: true });
const dateString = z.string().date();

export const confirmArrivalSchema = z.object({
  arrivedAt: isoDateTime.optional().nullable(),
});

export const residentsSchema = z.object({
  residents: z
    .array(
      z.object({
        customerId: z.string().trim().min(1).max(20),
        bedId: z.string().trim().min(1).max(20),
        identityChecked: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
});

export const rejectResidentSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export const approveResidentSchema = z.object({ note: nullableString });

export const recordPaperContractSchema = z.object({
  paperContractNumber: z.string().trim().min(1).max(50),
  signedDate: dateString,
  startDate: dateString,
  endDate: dateString,
  paymentCycle: z.string().trim().max(50).optional().nullable(),
  specialTerms: nullableString,
  services: z
    .array(
      z.object({
        serviceId: z.string().trim().min(1).max(20),
        price: decimalString,
        calculationMethod: z.string().trim().max(100).optional().nullable(),
        note: nullableString,
      }),
    )
    .max(100)
    .optional(),
});

export const confirmPaperSigningSchema = z.object({
  paperContractSigned: z.literal(true),
});

export const createInitialPaymentSchema = z.object({
  items: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(50),
        description: z.string().trim().max(500).optional().nullable(),
        quantity: z.number().positive().max(100000),
        unitPrice: decimalString,
      }),
    )
    .min(1)
    .max(50),
});

export const recordInitialPaymentSchema = z.object({
  amount: decimalString,
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  paidAt: isoDateTime,
  transactionReference: z.string().trim().max(100).optional().nullable(),
  receiptNumber: z.string().trim().max(50).optional().nullable(),
  externalEvidenceChecked: z.boolean(),
  note: nullableString,
});

export const stopCheckInSchema = z.object({ reason: nullableString });

export const listContractsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().max(40).optional(),
  customerName: z.string().trim().max(200).optional(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(20) });
const depositIdSchema = z.object({ depositId: z.string().trim().min(1).max(20) });
const residentParamsSchema = idSchema.extend({
  customerId: z.string().trim().min(1).max(20),
});

function validate(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(
      request.method === 'GET' ? request.query : (request.body ?? {}),
    );
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request data.', parsed.error.flatten()),
      );
    }
    if (request.method === 'GET') request.validatedQuery = parsed.data;
    else request.validatedBody = parsed.data;
    return next();
  };
}

function validateParams(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.params);
    if (!parsed.success) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid path parameter.'));
    }
    request.validatedParams = parsed.data as Record<string, string>;
    return next();
  };
}

export const validateConfirmArrival = validate(confirmArrivalSchema);
export const validateResidents = validate(residentsSchema);
export const validateRejectResident = validate(rejectResidentSchema);
export const validateApproveResident = validate(approveResidentSchema);
export const validateRecordPaperContract = validate(recordPaperContractSchema);
export const validateConfirmPaperSigning = validate(confirmPaperSigningSchema);
export const validateCreateInitialPayment = validate(createInitialPaymentSchema);
export const validateRecordInitialPayment = validate(recordInitialPaymentSchema);
export const validateStopCheckIn = validate(stopCheckInSchema);
export const validateListContracts = validate(listContractsSchema);
export const validateContractId = validateParams(idSchema);
export const validateDepositIdParam = validateParams(depositIdSchema);
export const validateResidentParams = validateParams(residentParamsSchema);
