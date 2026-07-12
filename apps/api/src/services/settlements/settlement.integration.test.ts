import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';
import { computeRefundRate } from './settlement.service.js';

const password = 'CheckoutTest123!';
const branchA = 'TST-CO-A';
const branchB = 'TST-CO-B';
const users = [
  {
    id: 'TST-CO-SALE',
    username: 'tst-co-sale',
    role: 'SALE',
    branchId: branchA,
  },
  {
    id: 'TST-CO-ACC',
    username: 'tst-co-acc',
    role: 'ACCOUNTANT',
    branchId: branchA,
  },
  {
    id: 'TST-CO-MGR',
    username: 'tst-co-mgr',
    role: 'MANAGER',
    branchId: branchA,
  },
  {
    id: 'TST-CO-SALE-B',
    username: 'tst-co-sale-b',
    role: 'SALE',
    branchId: branchB,
  },
] as const;
const roomId = 'TST-CO-ROOM';
const bedA = 'TST-CO-BED-A';
const bedB = 'TST-CO-BED-B';
const repA = 'TST-CO-REP-A';
const repB = 'TST-CO-REP-B';

async function agentFor(username: string) {
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
      { id: branchA, name: 'Checkout A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Checkout B', address: 'Test', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: users.map((u) => ({
      id: u.id,
      fullName: u.username,
      role: u.role,
      branchId: u.branchId,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  await prisma.account.createMany({
    data: users.map((u) => ({
      username: u.username,
      employeeId: u.id,
      passwordHash,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  await prisma.room.create({
    data: {
      id: roomId,
      branchId: branchA,
      name: 'Checkout Room',
      maximumCapacity: 2,
      operationalStatus: 'ACTIVE',
      beds: {
        create: [
          {
            id: bedA,
            name: 'Bed A',
            monthlyRent: '3000000.00',
            operationalStatus: 'ACTIVE',
          },
          {
            id: bedB,
            name: 'Bed B',
            monthlyRent: '3000000.00',
            operationalStatus: 'ACTIVE',
          },
        ],
      },
    },
  });
  await prisma.customer.createMany({
    data: [
      { id: repA, customerType: 'INDIVIDUAL', fullName: 'Checkout Rep A' },
      { id: repB, customerType: 'INDIVIDUAL', fullName: 'Checkout Rep B' },
    ],
  });

  // Scenario A: signed contract, active, checkout in exactly 6 months → 50%.
  const checkoutDate = new Date('2027-07-01T01:00:00.000Z');
  const startsOn = new Date(checkoutDate);
  startsOn.setMonth(startsOn.getMonth() - 6);
  await prisma.rentalRequest.create({
    data: {
      id: 'TST-CO-REQ-A',
      representativeId: repA,
      branchId: branchA,
      saleEmployeeId: users[0].id,
      registeredAt: new Date(),
      expectedResidents: 1,
      rentalMode: 'SHARED_BEDS',
      expectedCheckInDate: startsOn,
      rentalDurationMonths: 12,
      status: 'DEPOSIT_PROCESS',
    },
  });
  await prisma.deposit.create({
    data: {
      id: 'TST-CO-DEP-A',
      rentalRequestId: 'TST-CO-REQ-A',
      saleEmployeeId: users[0].id,
      createdAt: new Date(),
      rentalModeSnapshot: 'SHARED_BEDS',
      totalDepositAmount: '12000000.00',
      status: 'DEPOSITED',
      details: {
        create: {
          bedId: bedA,
          monthlyRentSnapshot: '3000000.00',
          depositMonths: 2,
          depositAmount: '6000000.00',
        },
      },
    },
  });
  await prisma.contract.create({
    data: {
      id: 'TST-CO-CTR-A',
      depositId: 'TST-CO-DEP-A',
      saleEmployeeId: users[0].id,
      startsOn,
      endsOn: new Date('2028-01-01'),
      totalMonthlyRent: '3000000.00',
      paperContractSigned: true,
      status: 'ACTIVE',
    },
  });
  await prisma.bedAllocation.create({
    data: {
      id: 'TST-CO-ALC-A',
      bedId: bedA,
      depositId: 'TST-CO-DEP-A',
      contractId: 'TST-CO-CTR-A',
      allocationType: 'OCCUPIED',
      status: 'ACTIVE',
      startedAt: startsOn,
    },
  });

  // Scenario B: deposit only (no contract) → 80%.
  await prisma.rentalRequest.create({
    data: {
      id: 'TST-CO-REQ-B',
      representativeId: repB,
      branchId: branchA,
      saleEmployeeId: users[0].id,
      registeredAt: new Date(),
      expectedResidents: 1,
      rentalMode: 'SHARED_BEDS',
      expectedCheckInDate: new Date('2027-01-01'),
      rentalDurationMonths: 12,
      status: 'DEPOSIT_PROCESS',
    },
  });
  await prisma.deposit.create({
    data: {
      id: 'TST-CO-DEP-B',
      rentalRequestId: 'TST-CO-REQ-B',
      saleEmployeeId: users[0].id,
      createdAt: new Date(),
      rentalModeSnapshot: 'SHARED_BEDS',
      totalDepositAmount: '12000000.00',
      status: 'DEPOSITED',
      details: {
        create: {
          bedId: bedB,
          monthlyRentSnapshot: '3000000.00',
          depositMonths: 2,
          depositAmount: '6000000.00',
        },
      },
    },
  });
  await prisma.bedAllocation.create({
    data: {
      id: 'TST-CO-ALC-B',
      bedId: bedB,
      depositId: 'TST-CO-DEP-B',
      allocationType: 'DEPOSITED',
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  });
});

afterAll(async () => {
  const depositIds = ['TST-CO-DEP-A', 'TST-CO-DEP-B'];
  await prisma.payment.deleteMany({
    where: {
      settlement: { checkoutRequest: { depositId: { in: depositIds } } },
    },
  });
  await prisma.deduction.deleteMany({
    where: {
      settlement: { checkoutRequest: { depositId: { in: depositIds } } },
    },
  });
  await prisma.settlement.deleteMany({
    where: { checkoutRequest: { depositId: { in: depositIds } } },
  });
  await prisma.checkoutInspectionItem.deleteMany({
    where: {
      inspection: { checkoutRequest: { depositId: { in: depositIds } } },
    },
  });
  await prisma.checkoutInspection.deleteMany({
    where: { checkoutRequest: { depositId: { in: depositIds } } },
  });
  await prisma.checkoutRequest.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.bedAllocation.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.contract.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.depositDetail.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.deposit.deleteMany({ where: { id: { in: depositIds } } });
  await prisma.rentalRequest.deleteMany({
    where: { id: { in: ['TST-CO-REQ-A', 'TST-CO-REQ-B'] } },
  });
  await prisma.customer.deleteMany({ where: { id: { in: [repA, repB] } } });
  await prisma.bed.deleteMany({ where: { roomId } });
  await prisma.room.deleteMany({ where: { id: roomId } });
  await prisma.account.deleteMany({
    where: { username: { in: users.map((u) => u.username) } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: users.map((u) => u.id) } },
  });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

describe('refund calculator', () => {
  it('applies documented rates', () => {
    const checkoutDate = new Date('2027-07-01');
    const sixMonthsAgo = new Date('2027-01-01');
    expect(computeRefundRate({ hasContract: false, checkoutDate })).toBe(80);
    expect(
      computeRefundRate({
        hasContract: true,
        startsOn: sixMonthsAgo,
        endsOn: new Date('2028-01-01'),
        checkoutDate,
      }),
    ).toBe(50);
    expect(
      computeRefundRate({
        hasContract: true,
        startsOn: new Date('2026-01-01'),
        endsOn: new Date('2028-01-01'),
        checkoutDate,
      }),
    ).toBe(70);
    expect(
      computeRefundRate({
        hasContract: true,
        startsOn: new Date('2026-01-01'),
        endsOn: new Date('2027-06-01'),
        checkoutDate,
      }),
    ).toBe(100);
  });
});

describe('checkout with a signed contract', () => {
  it('inspects, settles at 50%, refunds and liquidates', async () => {
    const sale = await agentFor(users[0].username);
    const accountant = await agentFor(users[1].username);
    const manager = await agentFor(users[2].username);
    const saleB = await agentFor(users[3].username);

    const created = await sale.post('/api/v1/checkout-requests').send({
      contractId: 'TST-CO-CTR-A',
      expectedCheckoutAt: '2027-07-01T01:00:00.000Z',
      reason: 'Chuyển nhà',
    });
    expect(created.status).toBe(201);
    const checkoutId = created.body.data.id;

    // Cross-branch sale cannot create against this branch's contract.
    await saleB
      .post('/api/v1/checkout-requests')
      .send({ contractId: 'TST-CO-CTR-A' })
      .expect(403);

    await sale
      .post(`/api/v1/checkout-requests/${checkoutId}/submit`)
      .expect(200);

    // Only manager inspects.
    await accountant
      .post(`/api/v1/checkout-requests/${checkoutId}/inspection`)
      .send({})
      .expect(403);
    await manager
      .post(`/api/v1/checkout-requests/${checkoutId}/inspection`)
      .send({ sanitationCondition: 'OK' })
      .expect(201);
    const detail = await manager.get(`/api/v1/checkout-requests/${checkoutId}`);
    const inspectionId = detail.body.data.inspection.id;
    await manager
      .post(`/api/v1/checkout-inspections/${inspectionId}/complete`)
      .expect(200);

    // Cannot settle before inspection is complete would 422; now it is complete.
    const settlement = await accountant
      .post(`/api/v1/checkout-requests/${checkoutId}/settlement`)
      .send({});
    expect(settlement.status).toBe(201);
    const settlementId = settlement.body.data.id;
    expect(settlement.body.data.refundRate).toBe(50);
    expect(settlement.body.data.baseRefundAmount).toBe('6000000.00');

    await accountant
      .put(`/api/v1/settlements/${settlementId}/deductions`)
      .send({
        deductions: [
          { type: 'CLEANING', amount: '1000000.00', source: 'MANUAL' },
        ],
      })
      .expect(200);
    const finalized = await accountant.post(
      `/api/v1/settlements/${settlementId}/finalize`,
    );
    expect(finalized.body.data.finalBalance).toBe('5000000.00');
    expect(finalized.body.data.result).toBe('REFUND_TO_CUSTOMER');

    await manager
      .post(`/api/v1/settlements/${settlementId}/customer-agreed`)
      .expect(200);

    await accountant
      .post(`/api/v1/settlements/${settlementId}/record-refund`)
      .send({
        amount: '5000000.00',
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        transactionReference: 'RF1',
      })
      .expect(200);

    // Cannot complete before liquidation checklist.
    await manager
      .post(`/api/v1/settlements/${settlementId}/complete-checkout`)
      .expect(422);
    await manager
      .post(`/api/v1/settlements/${settlementId}/confirm-liquidation`)
      .send({
        paperCheckoutSigned: true,
        contractLiquidated: true,
        keysRecovered: true,
        customerLeft: true,
      })
      .expect(200);
    const done = await manager.post(
      `/api/v1/settlements/${settlementId}/complete-checkout`,
    );
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('COMPLETED');

    const contract = await prisma.contract.findUnique({
      where: { id: 'TST-CO-CTR-A' },
    });
    expect(contract?.status).toBe('LIQUIDATED');
    const allocations = await prisma.bedAllocation.findMany({
      where: { depositId: 'TST-CO-DEP-A' },
    });
    expect(allocations.every((a) => a.status === 'ENDED')).toBe(true);
  });
});

describe('deposit-only checkout', () => {
  it('settles at 80% without inspection and collects an additional payment', async () => {
    const sale = await agentFor(users[0].username);
    const accountant = await agentFor(users[1].username);
    const manager = await agentFor(users[2].username);

    const created = await sale
      .post('/api/v1/checkout-requests')
      .send({ depositId: 'TST-CO-DEP-B' });
    const checkoutId = created.body.data.id;

    const settlement = await accountant
      .post(`/api/v1/checkout-requests/${checkoutId}/settlement`)
      .send({});
    expect(settlement.status).toBe(201);
    const settlementId = settlement.body.data.id;
    expect(settlement.body.data.refundRate).toBe(80);
    expect(settlement.body.data.baseRefundAmount).toBe('9600000.00');

    await accountant
      .put(`/api/v1/settlements/${settlementId}/deductions`)
      .send({
        deductions: [
          { type: 'DAMAGE', amount: '10000000.00', source: 'INSPECTION' },
        ],
      })
      .expect(200);
    const finalized = await accountant.post(
      `/api/v1/settlements/${settlementId}/finalize`,
    );
    expect(finalized.body.data.finalBalance).toBe('-400000.00');
    expect(finalized.body.data.result).toBe('CUSTOMER_PAYS_ADDITIONAL');

    await manager
      .post(`/api/v1/settlements/${settlementId}/customer-agreed`)
      .expect(200);
    await accountant
      .post(`/api/v1/settlements/${settlementId}/record-additional-payment`)
      .send({
        amount: '400000.00',
        method: 'CASH',
        paidAt: new Date().toISOString(),
        externalEvidenceChecked: true,
      })
      .expect(200);
    await manager
      .post(`/api/v1/settlements/${settlementId}/confirm-liquidation`)
      .send({
        paperCheckoutSigned: true,
        contractLiquidated: true,
        keysRecovered: true,
        customerLeft: true,
      })
      .expect(200);
    await manager
      .post(`/api/v1/settlements/${settlementId}/complete-checkout`)
      .expect(200);

    const allocations = await prisma.bedAllocation.findMany({
      where: { depositId: 'TST-CO-DEP-B' },
    });
    expect(allocations.every((a) => a.status === 'ENDED')).toBe(true);
  });
});
