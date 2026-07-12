import type { ErrorRequestHandler } from 'express';

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;
  const message = error instanceof Error ? error.message : 'Unexpected error.';

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      details: null,
    },
  });
};
