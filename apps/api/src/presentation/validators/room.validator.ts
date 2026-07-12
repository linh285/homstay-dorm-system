import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(2000).optional().nullable();
const shortNullableString = z.string().trim().max(100).optional().nullable();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const operationalStatus = z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE']);

const roomBodySchema = z.object({
  branchId: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(50),
  area: shortNullableString,
  floor: z.number().int().optional().nullable(),
  roomType: z.string().trim().max(50).optional().nullable(),
  maximumCapacity: z.number().int().positive().max(100),
  genderPolicy: z.string().trim().max(20).optional().nullable(),
  hasAirConditioner: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  curfew: shortNullableString,
  quietLevel: z.string().trim().max(50).optional().nullable(),
  rules: nullableString,
  operationalStatus: operationalStatus.default('ACTIVE'),
  note: nullableString,
});

export const createRoomSchema = roomBodySchema;
export const updateRoomSchema = roomBodySchema
  .omit({ branchId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const createBedSchema = z.object({
  name: z.string().trim().min(1).max(50),
  monthlyRent: decimalString,
  operationalStatus: operationalStatus.default('ACTIVE'),
  note: nullableString,
});

export const updateBedSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    monthlyRent: decimalString.optional(),
    operationalStatus: operationalStatus.optional(),
    note: nullableString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const roomServicesSchema = z.object({
  services: z
    .array(
      z.object({
        serviceId: z.string().trim().min(1).max(20),
        customPrice: decimalString.optional().nullable(),
        note: nullableString,
      }),
    )
    .max(100),
});

export const roomAssetsSchema = z.object({
  assets: z
    .array(
      z.object({
        assetTypeId: z.string().trim().min(1).max(20),
        quantity: z.number().int().positive().max(1000),
        currentCondition: shortNullableString,
        note: nullableString,
      }),
    )
    .max(200),
});

const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const listRoomsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().trim().max(20).optional(),
  area: z.string().trim().max(100).optional(),
  floor: z.coerce.number().int().optional(),
  roomType: z.string().trim().max(50).optional(),
  genderPolicy: z.string().trim().max(20).optional(),
  hasAirConditioner: optionalBooleanQuery,
  hasParking: optionalBooleanQuery,
  minPrice: decimalString.optional(),
  maxPrice: decimalString.optional(),
  hasAvailability: optionalBooleanQuery,
  operationalStatus: operationalStatus.optional(),
});

const roomIdSchema = z.object({ id: z.string().trim().min(1).max(20) });
const bedIdSchema = z.object({ id: z.string().trim().min(1).max(20) });

function validate(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(
      request.method === 'GET' ? request.query : request.body,
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

export const validateListRooms = validate(listRoomsSchema);
export const validateCreateRoom = validate(createRoomSchema);
export const validateUpdateRoom = validate(updateRoomSchema);
export const validateCreateBed = validate(createBedSchema);
export const validateUpdateBed = validate(updateBedSchema);
export const validateRoomServices = validate(roomServicesSchema);
export const validateRoomAssets = validate(roomAssetsSchema);
export const validateRoomId = validateParams(roomIdSchema);
export const validateBedId = validateParams(bedIdSchema);
