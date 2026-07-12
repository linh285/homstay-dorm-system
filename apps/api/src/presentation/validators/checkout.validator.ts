import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateTime = z.string().datetime({ offset: true });

export const createCheckoutSchema = z
  .object({
    contractId: z.string().trim().min(1).max(20).optional(),
    depositId: z.string().trim().min(1).max(20).optional(),
    expectedCheckoutAt: isoDateTime.optional().nullable(),
    reason: nullableString,
    note: nullableString,
  })
  .refine((value) => value.contractId || value.depositId, {
    message: 'Provide contractId or depositId.',
  });

export const updateCheckoutSchema = z
  .object({
    expectedCheckoutAt: isoDateTime.optional().nullable(),
    reason: nullableString,
    note: nullableString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const inspectionUpdateSchema = z
  .object({
    sanitationCondition: nullableString,
    areaCondition: nullableString,
    note: nullableString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const createInspectionSchema = z.object({
  sanitationCondition: nullableString,
  areaCondition: nullableString,
  note: nullableString,
});

export const inspectionItemsSchema = z.object({
  items: z
    .array(
      z.object({
        roomAssetId: z.string().trim().min(1).max(20).optional().nullable(),
        result: z.enum([
          'NORMAL',
          'DAMAGED',
          'MISSING',
          'CLEANING_REQUIRED',
          'OTHER_VIOLATION',
        ]),
        quantity: z.number().int().min(0).max(100000).optional().nullable(),
        description: nullableString,
        estimatedCost: decimalString.optional().nullable(),
        note: nullableString,
      }),
    )
    .max(200),
});

export const listCheckoutsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().max(40).optional(),
  customerName: z.string().trim().max(200).optional(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(20) });

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
    if (!parsed.success)
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid path parameter.'),
      );
    request.validatedParams = parsed.data as Record<string, string>;
    return next();
  };
}

export const validateCreateCheckout = validate(createCheckoutSchema);
export const validateUpdateCheckout = validate(updateCheckoutSchema);
export const validateCreateInspection = validate(createInspectionSchema);
export const validateInspectionUpdate = validate(inspectionUpdateSchema);
export const validateInspectionItems = validate(inspectionItemsSchema);
export const validateListCheckouts = validate(listCheckoutsSchema);
export const validateCheckoutId = validateParams(idSchema);
