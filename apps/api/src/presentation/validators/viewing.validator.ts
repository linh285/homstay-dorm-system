import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const isoDateTime = z.string().datetime({ offset: true });

export const createViewingSchema = z
  .object({
    rentalRequestId: z.string().trim().min(1).max(20),
    startsAt: isoDateTime,
    endsAt: isoDateTime.optional().nullable(),
    roomIds: z.array(z.string().trim().min(1).max(20)).min(1).max(20),
    notificationChannel: z.string().trim().max(20).optional().nullable(),
    notificationSent: z.boolean().optional(),
    note: nullableString,
  })
  .refine(
    (value) =>
      !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt),
    { message: 'endsAt must be after startsAt.', path: ['endsAt'] },
  );

export const updateViewingSchema = z
  .object({
    startsAt: isoDateTime.optional(),
    endsAt: isoDateTime.optional().nullable(),
    roomIds: z
      .array(z.string().trim().min(1).max(20))
      .min(1)
      .max(20)
      .optional(),
    notificationChannel: z.string().trim().max(20).optional().nullable(),
    notificationSent: z.boolean().optional(),
    note: nullableString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const rescheduleSchema = z
  .object({
    startsAt: isoDateTime,
    endsAt: isoDateTime.optional().nullable(),
    reason: nullableString,
  })
  .refine(
    (value) =>
      !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt),
    { message: 'endsAt must be after startsAt.', path: ['endsAt'] },
  );

export const cancelSchema = z.object({ reason: nullableString });
export const noShowSchema = z.object({ note: nullableString });
export const confirmVisitedSchema = z.object({ note: nullableString });

export const resultSchema = z
  .object({
    result: z.enum([
      'CUSTOMER_WANTS_DEPOSIT',
      'WANTS_MORE_VIEWINGS',
      'WANTS_TO_CHANGE_CRITERIA',
      'UNDECIDED',
      'NOT_INTERESTED',
    ]),
    selectedRoomId: z.string().trim().min(1).max(20).optional().nullable(),
    followUpDate: z.string().date().optional().nullable(),
    note: nullableString,
  })
  .refine(
    (value) =>
      value.result !== 'CUSTOMER_WANTS_DEPOSIT' ||
      Boolean(value.selectedRoomId),
    {
      message: 'selectedRoomId is required when the customer wants to deposit.',
      path: ['selectedRoomId'],
    },
  );

export const listViewingsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  rentalRequestId: z.string().trim().max(20).optional(),
  status: z
    .enum([
      'SCHEDULED',
      'CONFIRMED',
      'VISITED',
      'RESULT_RECORDED',
      'CANCELLED',
      'NO_SHOW',
    ])
    .optional(),
});

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
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid path parameter.',
          parsed.error.flatten(),
        ),
      );
    }
    request.validatedParams = parsed.data as Record<string, string>;
    return next();
  };
}

export const validateCreateViewing = validate(createViewingSchema);
export const validateUpdateViewing = validate(updateViewingSchema);
export const validateReschedule = validate(rescheduleSchema);
export const validateCancel = validate(cancelSchema);
export const validateNoShow = validate(noShowSchema);
export const validateConfirmVisited = validate(confirmVisitedSchema);
export const validateResult = validate(resultSchema);
export const validateListViewings = validate(listViewingsSchema);
export const validateViewingId = validateParams(viewingIdSchema);
