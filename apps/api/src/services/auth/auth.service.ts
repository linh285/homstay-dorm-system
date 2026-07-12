import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AccountRepository } from '../../data/repositories/account.repository.js';
import { AppError } from '../../shared/app-error.js';

export const AUTH_COOKIE_NAME = 'homestay_access_token';
const tokenLifetime = '8h';

export type CurrentEmployee = {
  id: string;
  fullName: string;
  role: 'SALE' | 'ACCOUNTANT' | 'MANAGER' | 'ADMIN';
  branchId: string | null;
};

type AuthTokenPayload = {
  sub: string;
  role: CurrentEmployee['role'];
  branchId: string | null;
};

export class AuthService {
  constructor(private readonly accounts = new AccountRepository()) {}

  async login(username: string, password: string) {
    const account = await this.accounts.findByUsername(username);

    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }

    if (account.status !== 'ACTIVE' || account.employee.status !== 'ACTIVE') {
      throw new AppError(
        401,
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động.',
      );
    }

    const employee: CurrentEmployee = {
      id: account.employee.id,
      fullName: account.employee.fullName,
      role: account.employee.role,
      branchId: account.employee.branchId,
    };
    const token = this.signToken(employee);

    await this.accounts.recordLogin(account.username);
    return { employee, token };
  }

  async getCurrentEmployee(employeeId: string): Promise<CurrentEmployee> {
    const employee = await this.accounts.findEmployeeById(employeeId);

    if (!employee || employee.status !== 'ACTIVE') {
      throw new AppError(
        401,
        'UNAUTHENTICATED',
        'Phiên đăng nhập không còn hiệu lực.',
      );
    }

    return {
      id: employee.id,
      fullName: employee.fullName,
      role: employee.role,
      branchId: employee.branchId,
    };
  }

  signToken(employee: CurrentEmployee): string {
    return jwt.sign(
      { role: employee.role, branchId: employee.branchId },
      env.JWT_SECRET,
      { subject: employee.id, expiresIn: tokenLifetime },
    );
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        !this.isRole(payload.role) ||
        (payload.branchId !== null && typeof payload.branchId !== 'string')
      ) {
        throw new Error('Invalid token payload.');
      }

      return {
        sub: payload.sub,
        role: payload.role,
        branchId: payload.branchId,
      };
    } catch {
      throw new AppError(
        401,
        'UNAUTHENTICATED',
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      );
    }
  }

  private isRole(value: unknown): value is CurrentEmployee['role'] {
    return (
      value === 'SALE' ||
      value === 'ACCOUNTANT' ||
      value === 'MANAGER' ||
      value === 'ADMIN'
    );
  }
}
