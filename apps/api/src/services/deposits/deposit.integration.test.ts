import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';
import { DepositExpirationService } from './deposit-expiration.service.js';

const password = 'DepositTest123!';
const branchA = 'TST-DP-A';
const branchB = 'TST-DP-B';
const users = [
  { id: 'TST-DP-SALE', username: 'tst-dp-sale', role: 'SALE', branchId: branchA },
  { id: 'TST-DP-ACC', username: 'tst-dp-acc', role: 'ACCOUNTANT', branchId: branchA },
  { id: 'TST-DP-MGR', username: 'tst-dp-mgr', role: 'MANAGER', branchId: branchA },
  { id: 'TST-DP-MGR-B', username: 'tst-dp-mgr-b', role: 'MANAGER', branchId: branchB },
] as const;
const roomId = 'TST-DP-ROOM';
const bedIds = ['TST-DP-BED-1', 'TST-DP-BED-2'];
const customerId = 'TST-DP-CUS';

const createdRequestIds: string[] = [];
const createdViewingIds: string[] = [];
const createdDepositIds: string[] = [];

async function agentFor(username: string) {
  const agent = request.agent(createApp());
  await agent.post('/api/v1/auth/login').send({ username, password }).expect(200);
  return agent;
}

let candidateSeq = 0;
async function setupCandidate() {
  candidateSeq += 1;
  const requestId = `TST-DP-REQ-${candidateSeq}`;
  const viewingId = `TST-DP-VW-${candidateSeq}`;
  await prisma.rentalRequest.create({
    data: {
      id: requestId,
      representativeId: customerId,
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
  await prisma.viewing.create({
    data: {
      id: viewingId,
      rentalRequestId: requestId,
      saleEmployeeId: users[0].id,
      startsAt: new Date('2027-01-01T02:00:00.000Z'),
      status: 'RESULT_RECORDED',
      finalResult: 'CUSTOMER_WANTS_DEPOSIT',
      details: { create: { roomId, customerInterested: true, viewedInPerson: true } },
    },
  });
  createdRequestIds.push(requestId);
  createdViewingIds.push(viewingId);
  return { requestId, viewingId };
}

async function createDeposit(bedId: string) {
  const { viewingId } = await setupCandidate();
  const sale = await agentFor(users[0].username);
  const response = await sale
    .post(`/api/v1/viewings/${viewingId}/create-deposit`)
    .send({ selectedBedIds: [bedId] });
  if (response.status === 201) createdDepositIds.push(response.body.data.id);
  return response;
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.branch.createMany({
    data: [
      { id: branchA, name: 'Deposit A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Deposit B', address: 'Test', status: 'ACTIVE' },
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
      name: 'Deposit Room',
      maximumCapacity: 2,
      operationalStatus: 'ACTIVE',
      beds: {
        create: bedIds.map((id, index) => ({
          id,
          name: `Bed ${index + 1}`,
          monthlyRent: '3000000.00',
          operationalStatus: 'ACTIVE',
        })),
      },
    },
  });
  await prisma.customer.create({
    data: { id: customerId, customerType: 'INDIVIDUAL', fullName: 'Deposit Customer' },
  });
});

afterAll(async () => {
  await prisma.bedAllocation.deleteMany({
    where: { depositId: { in: createdDepositIds } },
  });
  await prisma.payment.deleteMany({
    where: { depositId: { in: createdDepositIds } },
  });
  await prisma.depositDetail.deleteMany({
    where: { depositId: { in: createdDepositIds } },
  });
  await prisma.deposit.deleteMany({ where: { id: { in: createdDepositIds } } });
  await prisma.viewingDetail.deleteMany({
    where: { viewingId: { in: createdViewingIds } },
  });
  await prisma.viewing.deleteMany({ where: { id: { in: createdViewingIds } } });
  await prisma.rentalRequest.deleteMany({
    where: { id: { in: createdRequestIds } },
  });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.bed.deleteMany({ where: { roomId } });
  await prisma.room.deleteMany({ where: { id: roomId } });
  await prisma.account.deleteMany({
    where: { username: { in: users.map((u) => u.username) } },
  });
  await prisma.employee.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

describe('deposit flow', () => {
  it('walks the full happy path and allocates then deposits the bed', async () => {
    const created = await createDeposit(bedIds[0]!);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.details[0].depositAmount).toBe('6000000.00');
    expect(created.body.data.totalDepositAmount).toBe('6000000.00');

    const sale = await agentFor(users[0].username);
    const manager = await agentFor(users[2].username);
    const accountant = await agentFor(users[1].username);

    await sale
      .post(`/api/v1/deposits/${id}/confirm-customer-rules`)
      .send({ customerAgreed: true })
      .expect(200);
    await sale.post(`/api/v1/deposits/${id}/submit-room-check`).expect(200);
    await manager.post(`/api/v1/deposits/${id}/approve-room`).expect(200);

    const issued = await accountant.post(
      `/api/v1/deposits/${id}/issue-payment-request`,
    );
    expect(issued.status).toBe(200);
    expect(issued.body.data.status).toBe('WAITING_PAYMENT');
    expect(issued.body.data.allocations[0].allocationType).toBe('HELD');

    const paidAt = new Date().toISOString();
    await accountant
      .post(`/api/v1/deposits/${id}/record-payment`)
      .send({
        amount: '6000000.00',
        method: 'BANK_TRANSFER',
        paidAt,
        transactionReference: 'FT-1',
        externalEvidenceChecked: true,
      })
      .expect(200);

    const approved = await manager.post(
      `/api/v1/deposits/${id}/approve-payment`,
    );
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('DEPOSITED');
    expect(approved.body.data.allocations[0].allocationType).toBe('DEPOSITED');

    await sale
      .post(`/api/v1/deposits/${id}/schedule-check-in`)
      .send({ checkInAt: '2027-02-01T01:00:00.000Z' })
      .expect(200);
  });

  it('rejects the wrong amount and enforces role separation', async () => {
    const created = await createDeposit(bedIds[1]!);
    const id = created.body.data.id;
    const sale = await agentFor(users[0].username);
    const manager = await agentFor(users[2].username);
    const accountant = await agentFor(users[1].username);
    const otherManager = await agentFor(users[3].username);

    await sale
      .post(`/api/v1/deposits/${id}/confirm-customer-rules`)
      .send({ customerAgreed: true })
      .expect(200);
    await sale.post(`/api/v1/deposits/${id}/submit-room-check`).expect(200);

    // Sale cannot approve the room.
    await sale.post(`/api/v1/deposits/${id}/approve-room`).expect(403);
    // Cross-branch manager cannot approve.
    await otherManager.post(`/api/v1/deposits/${id}/approve-room`).expect(403);
    await manager.post(`/api/v1/deposits/${id}/approve-room`).expect(200);
    await accountant.post(`/api/v1/deposits/${id}/issue-payment-request`).expect(200);

    const wrong = await accountant
      .post(`/api/v1/deposits/${id}/record-payment`)
      .send({
        amount: '5000000.00',
        method: 'CASH',
        paidAt: new Date().toISOString(),
        externalEvidenceChecked: true,
      });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');

    await accountant
      .post(`/api/v1/deposits/${id}/record-payment`)
      .send({
        amount: '6000000.00',
        method: 'CASH',
        paidAt: new Date().toISOString(),
        externalEvidenceChecked: true,
      })
      .expect(200);
    // Accountant may not confirm money.
    await accountant.post(`/api/v1/deposits/${id}/approve-payment`).expect(403);
    // Sale may not confirm money.
    await sale.post(`/api/v1/deposits/${id}/approve-payment`).expect(403);

    // Clean up allocation for reuse of bed by later tests.
    await manager.post(`/api/v1/deposits/${id}/reject-payment`).send({ reason: 'test cleanup' }).expect(200);
  });

  it('prevents two deposits from holding the same bed', async () => {
    const first = await createDeposit(bedIds[1]!);
    const id1 = first.body.data.id;
    const sale = await agentFor(users[0].username);
    const manager = await agentFor(users[2].username);
    const accountant = await agentFor(users[1].username);
    await sale.post(`/api/v1/deposits/${id1}/confirm-customer-rules`).send({ customerAgreed: true });
    await sale.post(`/api/v1/deposits/${id1}/submit-room-check`);
    await manager.post(`/api/v1/deposits/${id1}/approve-room`);
    await accountant.post(`/api/v1/deposits/${id1}/issue-payment-request`).expect(200);

    // A second deposit cannot even be created for the same held bed.
    const blocked = await createDeposit(bedIds[1]!);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('BED_ALREADY_ALLOCATED');

    // release the first hold for the expiry test
    await sale.post(`/api/v1/deposits/${id1}/cancel`).expect(200);
    const allocations = await prisma.bedAllocation.findMany({
      where: { depositId: id1, status: 'ACTIVE' },
    });
    expect(allocations).toHaveLength(0);
  });

  it('expires holds past the 24h window and is idempotent', async () => {
    const created = await createDeposit(bedIds[1]!);
    const id = created.body.data.id;
    const sale = await agentFor(users[0].username);
    const manager = await agentFor(users[2].username);
    const accountant = await agentFor(users[1].username);
    await sale.post(`/api/v1/deposits/${id}/confirm-customer-rules`).send({ customerAgreed: true });
    await sale.post(`/api/v1/deposits/${id}/submit-room-check`);
    await manager.post(`/api/v1/deposits/${id}/approve-room`);
    await accountant.post(`/api/v1/deposits/${id}/issue-payment-request`).expect(200);

    // Force the deadline into the past.
    await prisma.payment.updateMany({
      where: { depositId: id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await prisma.bedAllocation.updateMany({
      where: { depositId: id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    // Recording after expiry must fail.
    const late = await accountant
      .post(`/api/v1/deposits/${id}/record-payment`)
      .send({
        amount: '6000000.00',
        method: 'CASH',
        paidAt: new Date(Date.now() - 30_000).toISOString(),
        externalEvidenceChecked: true,
      });
    expect(late.status).toBe(422);
    expect(late.body.error.code).toBe('DEPOSIT_PAYMENT_EXPIRED');

    const service = new DepositExpirationService();
    const first = await service.run(new Date());
    expect(first).toBeGreaterThanOrEqual(1);
    const deposit = await prisma.deposit.findUnique({ where: { id } });
    expect(deposit?.status).toBe('EXPIRED');
    const active = await prisma.bedAllocation.findMany({
      where: { depositId: id, status: 'ACTIVE' },
    });
    expect(active).toHaveLength(0);

    // Idempotent second run does nothing.
    const second = await service.run(new Date());
    expect(second).toBe(0);
  });
});
