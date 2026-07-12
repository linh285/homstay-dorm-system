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
const customerIds = ['TST-RPT-CUS-A', 'TST-RPT-CUS-B'];
const requestIds = ['TST-RPT-REQ-A', 'TST-RPT-REQ-B'];
const viewingIds = ['TST-RPT-VIEW-A'];
const depositIds = ['TST-RPT-DEP-A', 'TST-RPT-DEP-B'];
const paymentIds = ['TST-RPT-PAY-A', 'TST-RPT-PAY-B', 'TST-RPT-PAY-C'];
const contractIds = ['TST-RPT-CON-A'];
const checkoutIds = ['TST-RPT-CHK-A'];

async function signedInAgent(username: string) {
  const agent = request.agent(createApp());
  await agent
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  return agent;
}

async function cleanupTestData() {
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  await prisma.checkoutRequest.deleteMany({
    where: { id: { in: checkoutIds } },
  });
  await prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
  await prisma.deposit.deleteMany({ where: { id: { in: depositIds } } });
  await prisma.viewing.deleteMany({ where: { id: { in: viewingIds } } });
  await prisma.rentalRequest.deleteMany({
    where: { id: { in: requestIds } },
  });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
}

beforeAll(async () => {
  await cleanupTestData();
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
  await prisma.customer.createMany({
    data: [
      {
        id: customerIds[0]!,
        customerType: 'INDIVIDUAL',
        fullName: 'Reporting Customer A',
        phone: '0900000001',
      },
      {
        id: customerIds[1]!,
        customerType: 'INDIVIDUAL',
        fullName: 'Reporting Customer B',
        phone: '0900000002',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.rentalRequest.createMany({
    data: [
      {
        id: requestIds[0]!,
        representativeId: customerIds[0]!,
        branchId: branchA,
        saleEmployeeId: employeeIds[2]!,
        registeredAt: new Date(),
        expectedResidents: 1,
        rentalMode: 'SHARED_BEDS',
        preferredArea: 'Khu A',
        expectedCheckInDate: new Date('2027-03-01'),
        rentalDurationMonths: 12,
        status: 'ACTIVE',
      },
      {
        id: requestIds[1]!,
        representativeId: customerIds[1]!,
        branchId: branchB,
        saleEmployeeId: employeeIds[2]!,
        registeredAt: new Date(),
        expectedResidents: 1,
        rentalMode: 'SHARED_BEDS',
        expectedCheckInDate: new Date('2027-03-01'),
        rentalDurationMonths: 12,
        status: 'DEPOSIT_PROCESS',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.viewing.create({
    data: {
      id: viewingIds[0]!,
      rentalRequestId: requestIds[0]!,
      saleEmployeeId: employeeIds[2]!,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
      status: 'SCHEDULED',
    },
  });
  await prisma.deposit.createMany({
    data: [
      {
        id: depositIds[0]!,
        rentalRequestId: requestIds[0]!,
        saleEmployeeId: employeeIds[2]!,
        createdAt: new Date(),
        rentalModeSnapshot: 'SHARED_BEDS',
        totalDepositAmount: '3000000',
        scheduledCheckInAt: new Date(),
        status: 'WAITING_ROOM_CHECK',
      },
      {
        id: depositIds[1]!,
        rentalRequestId: requestIds[1]!,
        saleEmployeeId: employeeIds[2]!,
        createdAt: new Date(),
        rentalModeSnapshot: 'SHARED_BEDS',
        totalDepositAmount: '5000000',
        scheduledCheckInAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'DEPOSITED',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.payment.createMany({
    data: [
      {
        id: paymentIds[0]!,
        paymentType: 'DEPOSIT',
        direction: 'INBOUND',
        amountDue: '3000000',
        amountPaid: '3000000',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        paidAt: new Date(),
        recordedById: employeeIds[3]!,
        confirmedById: employeeIds[1]!,
        confirmedAt: new Date(),
        status: 'CONFIRMED',
        depositId: depositIds[0]!,
      },
      {
        id: paymentIds[1]!,
        paymentType: 'DEPOSIT',
        direction: 'INBOUND',
        amountDue: '5000000',
        amountPaid: '5000000',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        paidAt: new Date(),
        recordedById: employeeIds[3]!,
        status: 'PAYMENT_REJECTED',
        depositId: depositIds[1]!,
      },
      {
        id: paymentIds[2]!,
        paymentType: 'DEPOSIT',
        direction: 'INBOUND',
        amountDue: '9000000',
        amountPaid: '9000000',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        paidAt: new Date(),
        recordedById: employeeIds[3]!,
        status: 'WAITING_MANAGER_CONFIRMATION',
        depositId: depositIds[0]!,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.contract.create({
    data: {
      id: contractIds[0]!,
      depositId: depositIds[1]!,
      saleEmployeeId: employeeIds[2]!,
      startsOn: new Date(),
      endsOn: new Date('2027-12-31'),
      totalMonthlyRent: '2500000',
      status: 'READY_FOR_HANDOVER',
    },
  });
  await prisma.checkoutRequest.create({
    data: {
      id: checkoutIds[0]!,
      depositId: depositIds[1]!,
      contractId: contractIds[0]!,
      saleEmployeeId: employeeIds[2]!,
      requestedAt: new Date(),
      expectedCheckoutAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'WAITING_INSPECTION',
    },
  });
});

afterAll(async () => {
  await cleanupTestData();
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

  it('returns dashboard tasks and today schedules for branch roles', async () => {
    const sale = await (
      await signedInAgent('tst-rpt-sale')
    )
      .get('/api/v1/dashboard')
      .expect(200);
    expect(sale.body.data.tasks.length).toBeGreaterThan(0);
    expect(sale.body.data.todaySchedules.length).toBeGreaterThan(0);

    const manager = await (
      await signedInAgent('tst-rpt-manager')
    )
      .get('/api/v1/dashboard')
      .expect(200);
    expect(manager.body.data.tasks.length).toBeGreaterThan(0);
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

  it('serves new report endpoints with branch scoping and financial rules', async () => {
    await (
      await signedInAgent('tst-rpt-sale')
    )
      .get('/api/v1/reports/deposits')
      .expect(403);
    await (
      await signedInAgent('tst-rpt-accountant')
    )
      .get('/api/v1/reports/financial-summary')
      .expect(403);

    const manager = await signedInAgent('tst-rpt-manager');
    const deposits = await manager
      .get(`/api/v1/reports/deposits?branchId=${branchB}`)
      .expect(200);
    expect(deposits.body.data.scope).toBe(branchA);
    expect(deposits.body.data.countsByStatus.WAITING_ROOM_CHECK).toBe(1);

    const checkins = await manager
      .get('/api/v1/reports/check-ins-checkouts')
      .expect(200);
    expect(checkins.body.data.contractsByStatus.READY_FOR_HANDOVER).toBe(0);

    const financial = await manager
      .get('/api/v1/reports/financial-summary')
      .expect(200);
    expect(financial.body.data.depositReceived).toBe('3000000.00');
    expect(financial.body.data.netCashFlow).toBe('3000000.00');

    const admin = await signedInAgent('tst-rpt-admin');
    const branchBFinancial = await admin
      .get(`/api/v1/reports/financial-summary?branchId=${branchB}`)
      .expect(200);
    expect(branchBFinancial.body.data.depositReceived).toBe('0.00');
  });
});
