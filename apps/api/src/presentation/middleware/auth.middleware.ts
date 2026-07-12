import type { RequestHandler } from 'express';

import type { Role } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/app-error.js';
import {
  AUTH_COOKIE_NAME,
  AuthService,
} from '../../services/auth/auth.service.js';

const authService = new AuthService();

export const authenticate: RequestHandler = (request, _response, next) => {
  try {
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      throw new AppError(
        401,
        'UNAUTHENTICATED',
        'Bạn cần đăng nhập để tiếp tục.',
      );
    }

    const payload = authService.verifyToken(token);
    request.currentUser = {
      id: payload.sub,
      role: payload.role,
      branchId: payload.branchId,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRoles(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.currentUser) {
      return next(
        new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập để tiếp tục.'),
      );
    }
    if (!roles.includes(request.currentUser.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'Bạn không có quyền thực hiện thao tác này.',
        ),
      );
    }
    return next();
  };
}
