import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';
import { AppError } from '../../shared/app-error.js';
import {
  assertBranchAccess,
  canAccessBranch,
} from '../authorization/branch-access.js';
import { requireRoles } from '../../presentation/middleware/auth.middleware.js';

const password = 'TestPassword123!';
const branchA = 'TST-CN-AUTH-A';
const branchB = 'TST-CN-AUTH-B';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.branch.createMany({
    data: [
      { id: branchA, name: 'Test A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Test B', address: 'Test', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: [
      {
        id: 'TST-NV-SALE',
        fullName: 'Sale Test',
        role: 'SALE',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: 'TST-NV-LOCKED',
        fullName: 'Locked Test',
        role: 'MANAGER',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: 'TST-NV-ADMIN',
        fullName: 'Admin Test',
        role: 'ADMIN',
        branchId: null,
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.account.createMany({
    data: [
      {
        username: 'test-sale-auth',
        employeeId: 'TST-NV-SALE',
        passwordHash,
        status: 'ACTIVE',
      },
      {
        username: 'test-locked-auth',
        employeeId: 'TST-NV-LOCKED',
        passwordHash,
        status: 'LOCKED',
      },
      {
        username: 'test-admin-auth',
        employeeId: 'TST-NV-ADMIN',
        passwordHash,
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma.account.deleteMany({
    where: {
      username: {
        in: ['test-sale-auth', 'test-locked-auth', 'test-admin-auth'],
      },
    },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: ['TST-NV-SALE', 'TST-NV-LOCKED', 'TST-NV-ADMIN'] } },
  });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('logs in with valid credentials and sets an HTTP-only cookie', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ username: 'test-sale-auth', password });

    expect(response.status).toBe(200);
    expect(response.body.data.employee).toMatchObject({
      id: 'TST-NV-SALE',
      role: 'SALE',
      branchId: branchA,
    });
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('rejects an incorrect password', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ username: 'test-sale-auth', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an inactive account', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ username: 'test-locked-auth', password });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(createApp()).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('clears the authentication cookie on logout', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/v1/auth/login')
      .send({ username: 'test-sale-auth', password })
      .expect(200);
    const response = await agent.post('/api/v1/auth/logout');

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toContain(
      'homestay_access_token=;',
    );
  });
});

describe('authorization helpers', () => {
  it('denies the wrong role', () => {
    const middleware = requireRoles('MANAGER');
    const next = (error?: unknown) => {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('FORBIDDEN');
    };
    middleware(
      {
        currentUser: { id: 'TST-NV-SALE', role: 'SALE', branchId: branchA },
      } as never,
      {} as never,
      next,
    );
  });

  it('denies a different branch and permits ADMIN to read all branches', () => {
    expect(() =>
      assertBranchAccess(
        { id: 'TST-NV-SALE', role: 'SALE', branchId: branchA },
        branchB,
      ),
    ).toThrow('chi nhánh');
    expect(
      canAccessBranch(
        { id: 'TST-NV-ADMIN', role: 'ADMIN', branchId: null },
        branchB,
      ),
    ).toBe(true);
  });
});
