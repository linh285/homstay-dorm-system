import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    address: z.string().trim().min(1).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    accountHolderName: z.string().trim().max(100).optional().nullable(),
    bankAccountNumber: z.string().trim().max(50).optional().nullable(),
    bankName: z.string().trim().max(100).optional().nullable(),
    bankTransferInstruction: z.string().trim().optional().nullable(),
    status: z.string().trim().min(1).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one branch field.',
  });

const branchIdSchema = z.object({ id: z.string().trim().min(1).max(20) });

function validationError(error: z.ZodError) {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    'Invalid request data.',
    error.flatten(),
  );
}

export const validateBranchId: RequestHandler = (request, _response, next) => {
  const parsed = branchIdSchema.safeParse(request.params);
  if (!parsed.success) return next(validationError(parsed.error));
  request.validatedParams = parsed.data;
  return next();
};

export const validateBranchUpdate: RequestHandler = (
  request,
  _response,
  next,
) => {
  const parsed = updateBranchSchema.safeParse(request.body);
  if (!parsed.success) return next(validationError(parsed.error));
  request.validatedBody = parsed.data;
  return next();
};
