import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/app-error.js';

const nullableString = z.string().trim().max(500).optional().nullable();
const nullableShortString = z.string().trim().max(100).optional().nullable();
const optionalBoolean = z.boolean().optional().nullable();
const dateString = z.string().date();

const individualCustomerSchema = z.object({
  customerType: z.literal('INDIVIDUAL'),
  fullName: z.string().trim().min(1).max(100),
  birthDate: dateString.optional().nullable(),
  gender: nullableString,
  nationality: nullableString,
  identityDocumentType: nullableString,
  identityDocumentNumber: nullableString,
  phone: nullableString,
  email: z.string().email().max(255).optional().nullable(),
  address: nullableString,
});

const organizationCustomerSchema = z.object({
  customerType: z.literal('ORGANIZATION'),
  organizationName: z.string().trim().min(1).max(200),
  representativeName: z.string().trim().min(1).max(100),
  taxCode: nullableString,
  phone: nullableString,
  email: z.string().email().max(255).optional().nullable(),
  address: nullableString,
});

export const customerSchema = z.discriminatedUnion('customerType', [
  individualCustomerSchema,
  organizationCustomerSchema,
]);

const rentalRequestSchema = z.object({
  branchId: z.string().trim().min(1).max(20),
  expectedResidents: z.number().int().positive(),
  rentalMode: z.enum(['WHOLE_ROOM', 'SHARED_BEDS']),
  preferredRoomType: z.string().trim().max(50).optional().nullable(),
  preferredArea: nullableShortString,
  maximumBudget: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .nullable(),
  expectedCheckInDate: dateString,
  rentalDurationMonths: z.number().int().positive(),
  genderRequirement: nullableString,
  requiresAirConditioner: optionalBoolean,
  requiresParking: optionalBoolean,
  quietPreference: optionalBoolean,
  acceptsSharedBeds: optionalBoolean,
  livingSchedule: nullableString,
  note: nullableString,
});

export const createRentalRequestSchema = z.object({
  customer: customerSchema,
  rentalRequest: rentalRequestSchema,
});

export const updateRentalRequestSchema = z
  .object({
    customer: customerSchema.optional(),
    rentalRequest: rentalRequestSchema.partial().optional(),
  })
  .refine((value) => value.customer || value.rentalRequest, {
    message: 'Provide customer or rentalRequest data.',
  });

export const memberSchema = z.object({ customer: individualCustomerSchema });

export const listRentalRequestsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum([
      'registeredAt',
      'expectedCheckInDate',
      'expectedResidents',
      'status',
      'id',
    ])
    .default('registeredAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  id: z.string().trim().max(20).optional(),
  branchId: z.string().trim().max(20).optional(),
  customerName: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  rentalMode: z.enum(['WHOLE_ROOM', 'SHARED_BEDS']).optional(),
  status: z.enum(['ACTIVE', 'VIEWING', 'DEPOSIT_PROCESS', 'CLOSED']).optional(),
  expectedCheckInDate: dateString.optional(),
});

const rentalRequestIdSchema = z.object({
  id: z.string().trim().min(1).max(20),
});
const memberIdSchema = rentalRequestIdSchema.extend({
  memberId: z.string().trim().min(1).max(20),
});

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

export const validateCreateRentalRequest = validate(createRentalRequestSchema);
export const validateUpdateRentalRequest = validate(updateRentalRequestSchema);
export const validateMember = validate(memberSchema);
export const validateListRentalRequests = validate(listRentalRequestsSchema);

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

export const validateRentalRequestId = validateParams(rentalRequestIdSchema);
export const validateMemberIds = validateParams(memberIdSchema);
