import type { RequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { AppError } from '../../shared/app-error.js';
import {
  AUTH_COOKIE_NAME,
  AuthService,
} from '../../services/auth/auth.service.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(255),
});

const authService = new AuthService();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export const login: RequestHandler = async (request, response, next) => {
  try {
    const { username, password } = loginSchema.parse(request.body);
    const { employee, token } = await authService.login(username, password);

    response.cookie(AUTH_COOKIE_NAME, token, cookieOptions()).status(200).json({
      success: true,
      data: { employee },
      meta: null,
    });
  } catch (error) {
    next(
      error instanceof z.ZodError
        ? new AppError(
            400,
            'VALIDATION_ERROR',
            'Dữ liệu đăng nhập không hợp lệ.',
            error.flatten(),
          )
        : error,
    );
  }
};

export const logout: RequestHandler = (_request, response) => {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  response.status(200).json({ success: true, data: null, meta: null });
};

export const me: RequestHandler = async (request, response, next) => {
  try {
    const employee = await authService.getCurrentEmployee(
      request.currentUser!.id,
    );
    response
      .status(200)
      .json({ success: true, data: { employee }, meta: null });
  } catch (error) {
    next(error);
  }
};
