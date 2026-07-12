import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const reportQuerySchema = z.object({
  branchId: z.string().trim().min(1).max(20).optional(),
});

export const validateReportQuery: RequestHandler = (
  request,
  _response,
  next,
) => {
  const parsed = reportQuerySchema.safeParse(request.query);
  if (!parsed.success)
    return next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid report query.',
        parsed.error.flatten(),
      ),
    );
  request.validatedQuery = parsed.data;
  return next();
};
