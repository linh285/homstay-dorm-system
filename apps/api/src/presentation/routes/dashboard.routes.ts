import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateDashboard } from '../validators/dashboard.validator.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', authenticate, validateDashboard, dashboard);
