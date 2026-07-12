import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { AdministrationService } from '../../services/administration/administration.service.js';
import type { updateBranchSchema } from '../validators/administration.validator.js';

const administrationService = new AdministrationService();
type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
const branchId = (request: Parameters<RequestHandler>[0]) =>
  request.validatedParams!.id!;

export const listEmployees: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    response.status(200).json({
      success: true,
      data: await administrationService.listEmployees(),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const listBranches: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    response.status(200).json({
      success: true,
      data: await administrationService.listBranches(),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const getBranch: RequestHandler = async (request, response, next) => {
  try {
    response.status(200).json({
      success: true,
      data: await administrationService.getBranch(branchId(request)),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const updateBranch: RequestHandler = async (request, response, next) => {
  try {
    response.status(200).json({
      success: true,
      data: await administrationService.updateBranch(
        branchId(request),
        request.validatedBody as UpdateBranchInput,
      ),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
