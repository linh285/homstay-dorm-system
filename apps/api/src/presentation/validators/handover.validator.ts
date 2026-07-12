import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();

export const createHandoverSchema = z.object({
  areaCondition: nullableString,
  note: nullableString,
});

export const updateHandoverSchema = z
  .object({
    areaCondition: nullableString,
    utilitiesGuided: z.boolean().optional(),
    safetyGuided: z.boolean().optional(),
    paperHandoverSigned: z.boolean().optional(),
    note: nullableString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const handoverAssetsSchema = z.object({
  assets: z
    .array(
      z.object({
        roomAssetId: z.string().trim().min(1).max(20),
        deliveredQuantity: z.number().int().min(0).max(100000),
        conditionAtHandover: z.string().trim().max(100).optional().nullable(),
        note: nullableString,
      }),
    )
    .max(200),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(20) });
const contractIdSchema = z.object({
  contractId: z.string().trim().min(1).max(20),
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

export const validateCreateHandover = validate(createHandoverSchema);
export const validateUpdateHandover = validate(updateHandoverSchema);
export const validateHandoverAssets = validate(handoverAssetsSchema);
export const validateHandoverId = validateParams(idSchema);
export const validateHandoverContractId = validateParams(contractIdSchema);
