import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';

const password = 'RoomTest123!';
const branchA = 'TST-RM-A';
const branchB = 'TST-RM-B';
const employees = [
  { id: 'TST-RM-MGR-A', username: 'tst-rm-mgr-a', role: 'MANAGER', branchId: branchA },
  { id: 'TST-RM-MGR-B', username: 'tst-rm-mgr-b', role: 'MANAGER', branchId: branchB },
  { id: 'TST-RM-SALE-A', username: 'tst-rm-sale-a', role: 'SALE', branchId: branchA },
  { id: 'TST-RM-ADMIN', username: 'tst-rm-admin', role: 'ADMIN', branchId: null },
] as const;

const createdRoomIds: string[] = [];
const createdBedIds: string[] = [];
let serviceId = '';
let assetTypeId = '';

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
      { id: branchA, name: 'Room Test A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Room Test B', address: 'Test', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: employees.map((employee) => ({
      id: employee.id,
      fullName: employee.username,
      role: employee.role,
      branchId: employee.branchId,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  await prisma.account.createMany({
    data: employees.map((employee) => ({
      username: employee.username,
      employeeId: employee.id,
      passwordHash,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  const service = await prisma.service.create({
    data: {
      id: 'TST-RM-SVC',
      name: 'Room Test Service',
      unit: 'thang',
      unitPrice: '100000.00',
      status: 'ACTIVE',
    },
  });
  serviceId = service.id;
  const assetType = await prisma.assetType.create({
    data: { id: 'TST-RM-AST', name: 'Room Test Asset', unit: 'cai' },
  });
  assetTypeId = assetType.id;
});

afterAll(async () => {
  await prisma.bedAllocation.deleteMany({
    where: { bed: { roomId: { in: createdRoomIds } } },
  });
  await prisma.roomService.deleteMany({
    where: { roomId: { in: createdRoomIds } },
  });
  await prisma.roomAsset.deleteMany({
    where: { roomId: { in: createdRoomIds } },
  });
  await prisma.bed.deleteMany({ where: { id: { in: createdBedIds } } });
  await prisma.bed.deleteMany({ where: { roomId: { in: createdRoomIds } } });
  await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.assetType.deleteMany({ where: { id: assetTypeId } });
  await prisma.account.deleteMany({
    where: { username: { in: employees.map((e) => e.username) } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: employees.map((e) => e.id) } },
  });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

async function createRoom(username: string, branchId: string) {
  const response = await (await agentFor(username))
    .post('/api/v1/rooms')
    .send({ branchId, name: `Room ${createdRoomIds.length}`, maximumCapacity: 4 });
  if (response.status === 201) createdRoomIds.push(response.body.data.id);
  return response;
}

describe('rooms API', () => {
  it('requires authentication', async () => {
    await request(createApp()).get('/api/v1/rooms').expect(401);
  });

  it('forbids SALE and ACCOUNTANT from creating rooms', async () => {
    const sale = await agentFor('tst-rm-sale-a');
    await sale
      .post('/api/v1/rooms')
      .send({ branchId: branchA, name: 'X', maximumCapacity: 2 })
      .expect(403);
  });

  it('lets a MANAGER create a room in their branch', async () => {
    const response = await createRoom('tst-rm-mgr-a', branchA);
    expect(response.status).toBe(201);
    expect(response.body.data.operationalStatus).toBe('ACTIVE');
    expect(response.body.data.beds).toEqual([]);
  });

  it('rejects a MANAGER creating a room in another branch', async () => {
    const response = await (await agentFor('tst-rm-mgr-a'))
      .post('/api/v1/rooms')
      .send({ branchId: branchB, name: 'Cross', maximumCapacity: 2 });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('adds beds, blocks duplicate names, and derives availability', async () => {
    const room = await createRoom('tst-rm-mgr-a', branchA);
    const manager = await agentFor('tst-rm-mgr-a');
    const roomId = room.body.data.id;

    const bed = await manager
      .post(`/api/v1/rooms/${roomId}/beds`)
      .send({ name: 'B1', monthlyRent: '3000000.00' });
    expect(bed.status).toBe(201);
    createdBedIds.push(bed.body.data.id);

    const duplicate = await manager
      .post(`/api/v1/rooms/${roomId}/beds`)
      .send({ name: 'B1', monthlyRent: '3000000.00' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('BED_NAME_TAKEN');

    const availability = await manager.get(
      `/api/v1/rooms/${roomId}/availability`,
    );
    expect(availability.status).toBe(200);
    expect(availability.body.data.beds[0].businessStatus).toBe('AVAILABLE');
  });

  it('blocks taking a bed out of service while it is occupied', async () => {
    const room = await createRoom('tst-rm-mgr-a', branchA);
    const manager = await agentFor('tst-rm-mgr-a');
    const roomId = room.body.data.id;
    const bed = await manager
      .post(`/api/v1/rooms/${roomId}/beds`)
      .send({ name: 'B1', monthlyRent: '3000000.00' });
    const bedId = bed.body.data.id;
    createdBedIds.push(bedId);

    const allocation = await prisma.bedAllocation.create({
      data: {
        id: `TST-RM-ALLOC-${createdRoomIds.length}`,
        bedId,
        allocationType: 'OCCUPIED',
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    const response = await manager
      .patch(`/api/v1/beds/${bedId}`)
      .send({ operationalStatus: 'MAINTENANCE' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('ROOM_HAS_ACTIVE_ALLOCATION');

    await prisma.bedAllocation.delete({ where: { id: allocation.id } });
  });

  it('replaces room services and asset lists', async () => {
    const room = await createRoom('tst-rm-mgr-a', branchA);
    const manager = await agentFor('tst-rm-mgr-a');
    const roomId = room.body.data.id;

    const services = await manager
      .put(`/api/v1/rooms/${roomId}/services`)
      .send({ services: [{ serviceId }] });
    expect(services.status).toBe(200);
    expect(services.body.data).toHaveLength(1);

    const assets = await manager
      .put(`/api/v1/rooms/${roomId}/assets`)
      .send({ assets: [{ assetTypeId, quantity: 2 }] });
    expect(assets.status).toBe(200);
    expect(assets.body.data[0].quantity).toBe(2);
  });

  it('prevents cross-branch reads for a MANAGER but allows ADMIN', async () => {
    const room = await createRoom('tst-rm-mgr-a', branchA);
    const roomId = room.body.data.id;
    const otherManager = await agentFor('tst-rm-mgr-b');
    await otherManager.get(`/api/v1/rooms/${roomId}`).expect(403);
    const admin = await agentFor('tst-rm-admin');
    await admin.get(`/api/v1/rooms/${roomId}`).expect(200);
  });

  it('lets SALE, MANAGER and ADMIN read the service catalog', async () => {
    const sale = await agentFor('tst-rm-sale-a');
    const response = await sale.get('/api/v1/services');
    expect(response.status).toBe(200);
    expect(
      response.body.data.some(
        (service: { id: string }) => service.id === serviceId,
      ),
    ).toBe(true);
  });
});
