import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';

const password = 'ReportingTest123!';
const branchA = 'TST-RPT-A';
const branchB = 'TST-RPT-B';
const employeeIds = [
  'TST-RPT-ADMIN',
  'TST-RPT-MANAGER',
  'TST-RPT-SALE',
  'TST-RPT-ACCOUNTANT',
];
const usernames = [
  'tst-rpt-admin',
  'tst-rpt-manager',
  'tst-rpt-sale',
  'tst-rpt-accountant',
];

async function signedInAgent(username: string) {
  const agent = request.agent(createApp());
  await agent
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  return agent;
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.branch.createMany({
    data: [
      {
        id: branchA,
        name: 'Reporting Branch A',
        address: 'Test A',
        status: 'ACTIVE',
      },
      {
        id: branchB,
        name: 'Reporting Branch B',
        address: 'Test B',
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: [
      {
        id: employeeIds[0]!,
        fullName: 'Reporting Admin',
        role: 'ADMIN',
        branchId: null,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[1]!,
        fullName: 'Reporting Manager',
        role: 'MANAGER',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[2]!,
        fullName: 'Reporting Sale',
        role: 'SALE',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[3]!,
        fullName: 'Reporting Accountant',
        role: 'ACCOUNTANT',
        branchId: branchA,
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.account.createMany({
    data: usernames.map((username, index) => ({
      username,
      employeeId: employeeIds[index]!,
      passwordHash,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  await prisma.room.createMany({
    data: [
      {
        id: 'TST-RPT-ROOM-A',
        branchId: branchA,
        name: 'Room A',
        maximumCapacity: 1,
        operationalStatus: 'ACTIVE',
      },
      {
        id: 'TST-RPT-ROOM-B',
        branchId: branchB,
        name: 'Room B',
        maximumCapacity: 1,
        operationalStatus: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.bed.createMany({
    data: [
      {
        id: 'TST-RPT-BED-A',
        roomId: 'TST-RPT-ROOM-A',
        name: 'Bed A',
        monthlyRent: '1000000',
        operationalStatus: 'ACTIVE',
      },
      {
        id: 'TST-RPT-BED-B',
        roomId: 'TST-RPT-ROOM-B',
        name: 'Bed B',
        monthlyRent: '1000000',
        operationalStatus: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma.bed.deleteMany({
    where: { id: { in: ['TST-RPT-BED-A', 'TST-RPT-BED-B'] } },
  });
  await prisma.room.deleteMany({
    where: { id: { in: ['TST-RPT-ROOM-A', 'TST-RPT-ROOM-B'] } },
  });
  await prisma.account.deleteMany({ where: { username: { in: usernames } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

describe('dashboard, administration, and reporting APIs', () => {
  it('returns 401 for unauthenticated dashboard access', async () => {
    await request(createApp()).get('/api/v1/dashboard').expect(401);
  });

  it('returns dashboard counters for all roles', async () => {
    for (const username of usernames) {
      const response = await (
        await signedInAgent(username)
      )
        .get('/api/v1/dashboard')
        .expect(200);
      expect(response.body.data.counters).toBeTypeOf('object');
    }
  });

  it('permits only ADMIN to read administration data and update branches', async () => {
    await (
      await signedInAgent('tst-rpt-sale')
    )
      .get('/api/v1/employees')
      .expect(403);
    const admin = await signedInAgent('tst-rpt-admin');
    const employees = await admin.get('/api/v1/employees').expect(200);
    expect(
      employees.body.data.some(
        (employee: { id: string }) => employee.id === employeeIds[1],
      ),
    ).toBe(true);
    await admin.get('/api/v1/branches').expect(200);
    const updated = await admin
      .patch(`/api/v1/branches/${branchA}`)
      .send({ phone: '0909999999', bankName: 'Test Bank' })
      .expect(200);
    expect(updated.body.data.phone).toBe('0909999999');
  });

  it('limits MANAGER reports to its own branch and permits ADMIN system reports', async () => {
    const manager = await signedInAgent('tst-rpt-manager');
    const managerSummary = await manager
      .get('/api/v1/reports/branch-summary')
      .expect(200);
    expect(managerSummary.body.data.scope).toBe(branchA);
    const managerOccupancy = await manager
      .get(`/api/v1/reports/occupancy?branchId=${branchB}`)
      .expect(200);
    expect(managerOccupancy.body.data.scope).toBe(branchA);
    await manager.get('/api/v1/reports/system-summary').expect(403);

    const admin = await signedInAgent('tst-rpt-admin');
    const system = await admin
      .get('/api/v1/reports/system-summary')
      .expect(200);
    expect(system.body.data.scope).toBe('SYSTEM');
    const branchOccupancy = await admin
      .get(`/api/v1/reports/occupancy?branchId=${branchB}`)
      .expect(200);
    expect(branchOccupancy.body.data.scope).toBe(branchB);
    await admin.get('/api/v1/reports/rental-funnel').expect(200);
  });
});
