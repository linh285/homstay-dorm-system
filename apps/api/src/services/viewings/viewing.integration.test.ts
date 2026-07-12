import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';

const password = 'ViewingTest123!';
const branchA = 'TST-VW-A';
const branchB = 'TST-VW-B';
const saleA = { id: 'TST-VW-SALE-A', username: 'tst-vw-sale-a' };
const saleB = { id: 'TST-VW-SALE-B', username: 'tst-vw-sale-b' };
const roomA = 'TST-VW-ROOM-A';
const roomB = 'TST-VW-ROOM-B';
const customerId = 'TST-VW-CUS';
let requestId = '';
const viewingIds: string[] = [];

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
      { id: branchA, name: 'Viewing A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Viewing B', address: 'Test', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: [
      {
        id: saleA.id,
        fullName: 'Sale A',
        role: 'SALE',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: saleB.id,
        fullName: 'Sale B',
        role: 'SALE',
        branchId: branchB,
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.account.createMany({
    data: [
      {
        username: saleA.username,
        employeeId: saleA.id,
        passwordHash,
        status: 'ACTIVE',
      },
      {
        username: saleB.username,
        employeeId: saleB.id,
        passwordHash,
        status: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.room.createMany({
    data: [
      {
        id: roomA,
        branchId: branchA,
        name: 'VW Room A',
        maximumCapacity: 4,
        operationalStatus: 'ACTIVE',
      },
      {
        id: roomB,
        branchId: branchB,
        name: 'VW Room B',
        maximumCapacity: 4,
        operationalStatus: 'ACTIVE',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      customerType: 'INDIVIDUAL',
      fullName: 'Viewing Customer',
    },
  });
  const rentalRequest = await prisma.rentalRequest.create({
    data: {
      id: 'TST-VW-REQ',
      representativeId: customerId,
      branchId: branchA,
      saleEmployeeId: saleA.id,
      registeredAt: new Date(),
      expectedResidents: 2,
      rentalMode: 'SHARED_BEDS',
      expectedCheckInDate: new Date('2027-01-01'),
      rentalDurationMonths: 12,
      status: 'ACTIVE',
    },
  });
  requestId = rentalRequest.id;
});

afterAll(async () => {
  await prisma.viewingDetail.deleteMany({
    where: { viewingId: { in: viewingIds } },
  });
  await prisma.viewing.deleteMany({ where: { id: { in: viewingIds } } });
  await prisma.rentalRequest.deleteMany({ where: { id: requestId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.room.deleteMany({ where: { id: { in: [roomA, roomB] } } });
  await prisma.account.deleteMany({
    where: { username: { in: [saleA.username, saleB.username] } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: [saleA.id, saleB.id] } },
  });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

async function createViewing(agent: ReturnType<typeof request.agent>) {
  const response = await agent.post('/api/v1/viewings').send({
    rentalRequestId: requestId,
    startsAt: '2027-01-10T09:00:00+07:00',
    endsAt: '2027-01-10T10:00:00+07:00',
    roomIds: [roomA],
  });
  if (response.status === 201) viewingIds.push(response.body.data.id);
  return response;
}

describe('viewings API', () => {
  it('creates a viewing and moves the request to VIEWING', async () => {
    const response = await createViewing(await agentFor(saleA.username));
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('SCHEDULED');
    expect(response.body.data.details).toHaveLength(1);
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: requestId },
    });
    expect(rentalRequest?.status).toBe('VIEWING');
  });

  it('rejects rooms from another branch', async () => {
    const response = await (
      await agentFor(saleA.username)
    )
      .post('/api/v1/viewings')
      .send({
        rentalRequestId: requestId,
        startsAt: '2027-01-10T09:00:00+07:00',
        roomIds: [roomB],
      });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('ROOM_NOT_IN_BRANCH');
  });

  it('rejects recording a result before the customer visits', async () => {
    const created = await createViewing(await agentFor(saleA.username));
    const agent = await agentFor(saleA.username);
    const response = await agent
      .post(`/api/v1/viewings/${created.body.data.id}/result`)
      .send({ result: 'UNDECIDED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('walks the full happy path to a deposit result', async () => {
    const created = await createViewing(await agentFor(saleA.username));
    const agent = await agentFor(saleA.username);
    const id = created.body.data.id;
    await agent.post(`/api/v1/viewings/${id}/confirm`).expect(200);
    await agent.post(`/api/v1/viewings/${id}/confirm-visited`).expect(200);
    const missingRoom = await agent
      .post(`/api/v1/viewings/${id}/result`)
      .send({ result: 'CUSTOMER_WANTS_DEPOSIT' });
    expect(missingRoom.status).toBe(400);

    const result = await agent
      .post(`/api/v1/viewings/${id}/result`)
      .send({ result: 'CUSTOMER_WANTS_DEPOSIT', selectedRoomId: roomA });
    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe('RESULT_RECORDED');
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: requestId },
    });
    expect(rentalRequest?.status).toBe('DEPOSIT_PROCESS');
  });

  it('prevents a SALE from another branch from viewing', async () => {
    const other = await agentFor(saleB.username);
    await other.get(`/api/v1/viewings/${viewingIds[0]}`).expect(403);
  });
});
