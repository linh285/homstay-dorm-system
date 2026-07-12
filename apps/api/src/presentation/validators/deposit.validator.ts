import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateTime = z.string().datetime({ offset: true });
const reasonRequired = z.string().trim().min(1).max(2000);

export const createDepositSchema = z.object({
  selectedBedIds: z.array(z.string().trim().min(1).max(20)).min(1).max(50),
});

export const confirmCustomerRulesSchema = z.object({
  customerAgreed: z.literal(true),
  confirmedAt: isoDateTime.optional().nullable(),
  note: nullableString,
});

export const rejectRoomSchema = z.object({ reason: reasonRequired });

export const recordPaymentSchema = z.object({
  amount: decimalString,
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  paidAt: isoDateTime,
  transactionReference: z.string().trim().max(100).optional().nullable(),
  receiptNumber: z.string().trim().max(50).optional().nullable(),
  externalEvidenceChecked: z.boolean(),
  note: nullableString,
});

export const reasonSchema = z.object({ reason: reasonRequired });
export const emptySchema = z.object({}).passthrough();

export const scheduleCheckInSchema = z.object({
  checkInAt: isoDateTime,
  note: nullableString,
});

export const listDepositsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum([
      'DRAFT',
      'WAITING_ROOM_CHECK',
      'ROOM_APPROVED',
      'ROOM_REJECTED',
      'WAITING_PAYMENT',
      'WAITING_MANAGER_CONFIRMATION',
      'PAYMENT_RECHECK',
      'PAYMENT_REJECTED',
      'DEPOSITED',
      'EXPIRED',
      'CANCELLED',
    ])
    .optional(),
  customerName: z.string().trim().max(200).optional(),
  depositCode: z.string().trim().max(20).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(20) });
const viewingIdSchema = z.object({ id: z.string().trim().min(1).max(20) });

function validate(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(
      request.method === 'GET' ? request.query : (request.body ?? {}),
    );
    if (!parsed.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid request data.',
          parsed.error.flatten(),
        ),
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
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid path parameter.'),
      );
    }
    request.validatedParams = parsed.data as Record<string, string>;
    return next();
  };
}

export const validateCreateDeposit = validate(createDepositSchema);
export const validateConfirmCustomerRules = validate(confirmCustomerRulesSchema);
export const validateRejectRoom = validate(rejectRoomSchema);
export const validateRecordPayment = validate(recordPaymentSchema);
export const validateReason = validate(reasonSchema);
export const validateScheduleCheckIn = validate(scheduleCheckInSchema);
export const validateListDeposits = validate(listDepositsSchema);
export const validateDepositId = validateParams(idSchema);
export const validateViewingId = validateParams(viewingIdSchema);
