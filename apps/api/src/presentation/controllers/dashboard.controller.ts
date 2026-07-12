import type { RequestHandler } from 'express';
import { DashboardService } from '../../services/dashboard/dashboard.service.js';

const service = new DashboardService();
export const dashboard: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await service.get(request.currentUser!),
      meta: null,
    });
  } catch (error) {
    next(error);
  }
};
