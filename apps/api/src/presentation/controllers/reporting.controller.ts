import type { RequestHandler } from 'express';
import { ReportingService } from '../../services/reporting/reporting.service.js';

const service = new ReportingService();
const branchQuery = (request: Parameters<RequestHandler>[0]) =>
  (request.validatedQuery as { branchId?: string } | undefined)?.branchId;

export const branchSummary: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json({
      success: true,
      data: await service.branchSummary(request.currentUser!),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const systemSummary: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json({
      success: true,
      data: await service.systemSummary(request.currentUser!),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const occupancy: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await service.occupancy(request.currentUser!, branchQuery(request)),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
export const rentalFunnel: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await service.rentalFunnel(
        request.currentUser!,
        branchQuery(request),
      ),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};

export const deposits: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await service.deposits(request.currentUser!, branchQuery(request)),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};

export const checkInsCheckouts: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json({
      success: true,
      data: await service.checkInsCheckouts(
        request.currentUser!,
        branchQuery(request),
      ),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};

export const financialSummary: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json({
      success: true,
      data: await service.financialSummary(
        request.currentUser!,
        branchQuery(request),
      ),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
