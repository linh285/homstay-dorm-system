import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateTime = z.string().datetime({ offset: true });

export const deductionsSchema = z.object({
  deductions: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(50),
        description: nullableString,
        amount: decimalString,
        source: z
          .enum(['DEBT', 'INSPECTION', 'VIOLATION', 'MANUAL'])
          .optional()
          .nullable(),
      }),
    )
    .max(100),
});

export const disputedSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const additionalPaymentSchema = z.object({
  amount: decimalString,
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  paidAt: isoDateTime,
  transactionReference: z.string().trim().max(100).optional().nullable(),
  receiptNumber: z.string().trim().max(50).optional().nullable(),
  externalEvidenceChecked: z.boolean(),
  note: nullableString,
});

export const refundSchema = z.object({
  amount: decimalString,
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  paidAt: isoDateTime,
  transactionReference: z.string().trim().max(100).optional().nullable(),
  receiptNumber: z.string().trim().max(50).optional().nullable(),
  note: nullableString,
});

export const liquidationSchema = z.object({
  paperCheckoutSigned: z.boolean(),
  contractLiquidated: z.boolean(),
  keysRecovered: z.boolean(),
  customerLeft: z.boolean(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(20) });

function validate(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body ?? {});
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
    request.validatedBody = parsed.data;
    return next();
  };
}

function validateParams(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.params);
    if (!parsed.success)
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid path parameter.'),
      );
    request.validatedParams = parsed.data as Record<string, string>;
    return next();
  };
}

export const validateDeductions = validate(deductionsSchema);
export const validateDisputed = validate(disputedSchema);
export const validateAdditionalPayment = validate(additionalPaymentSchema);
export const validateRefund = validate(refundSchema);
export const validateLiquidation = validate(liquidationSchema);
export const validateSettlementId = validateParams(idSchema);
