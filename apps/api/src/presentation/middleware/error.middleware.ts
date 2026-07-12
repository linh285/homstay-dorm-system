import type { ErrorRequestHandler } from 'express';

import { AppError } from '../../shared/app-error.js';

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error.');

  response.status(appError.status).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
