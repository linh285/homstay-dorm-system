import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';

const password = 'RentalRequestTest123!';
const branchA = 'TST-RR-A';
const branchB = 'TST-RR-B';
const employeeIds = [
  'TST-RR-SALE-A',
  'TST-RR-SALE-B',
  'TST-RR-ACCOUNTANT',
  'TST-RR-MANAGER',
];
const usernames = [
  'tst-rr-sale-a',
  'tst-rr-sale-b',
  'tst-rr-accountant',
  'tst-rr-manager',
];
const requestIds: string[] = [];
const customerIds: string[] = [];
const roomIds = [
  'TST-RR-MALE-HIGH',
  'TST-RR-MALE-MEDIUM',
  'TST-RR-ANY-LOW',
  'TST-RR-FEMALE',
  'TST-RR-NO-GENDER',
  'TST-RR-HELD',
  'TST-RR-DEPOSITED',
  'TST-RR-OCCUPIED',
];
const bedIds = roomIds.map((_id, index) => `TST-RRB${index + 1}`);
const allocationIds = ['TST-RRA-HELD', 'TST-RRA-DEPOSITED', 'TST-RRA-OCCUPIED'];

const rentalRequest = {
  branchId: branchA,
  expectedResidents: 2,
  rentalMode: 'SHARED_BEDS',
  preferredArea: 'Khu A',
  maximumBudget: '4000000.00',
  expectedCheckInDate: '2027-02-01',
  rentalDurationMonths: 12,
};

async function signedInAgent(username: string) {
  const agent = request.agent(createApp());
  await agent
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  return agent;
}

async function createIndividual(agent: ReturnType<typeof request.agent>) {
  const response = await agent.post('/api/v1/rental-requests').send({
    customer: {
      customerType: 'INDIVIDUAL',
      fullName: `TST Individual ${requestIds.length}`,
      phone: '0900000000',
    },
    rentalRequest,
  });
  requestIds.push(response.body.data.id);
  customerIds.push(response.body.data.representative.id);
  return response;
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.branch.createMany({
    data: [
      { id: branchA, name: 'Rental Test A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Rental Test B', address: 'Test', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: [
      {
        id: employeeIds[0]!,
        fullName: 'Rental Sale A',
        role: 'SALE',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[1]!,
        fullName: 'Rental Sale B',
        role: 'SALE',
        branchId: branchB,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[2]!,
        fullName: 'Rental Accountant',
        role: 'ACCOUNTANT',
        branchId: branchA,
        status: 'ACTIVE',
      },
      {
        id: employeeIds[3]!,
        fullName: 'Rental Manager',
        role: 'MANAGER',
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
        id: roomIds[0]!,
        branchId: branchA,
        name: 'Male high',
        maximumCapacity: 1,
        genderPolicy: 'MALE',
        quietLevel: 'HIGH',
        operationalStatus: 'ACTIVE',
      },
      {
        id: roomIds[1]!,
        branchId: branchA,
        name: 'Male medium',
        maximumCapacity: 1,
        genderPolicy: 'MALE',
        quietLevel: 'MEDIUM',
        operationalStatus: 'ACTIVE',
      },
      {
        id: roomIds[2]!,
        branchId: branchA,
        name: 'Any low',
        maximumCapacity: 1,
        genderPolicy: 'ANY',
        quietLevel: 'LOW',
        operationalStatus: 'ACTIVE',
      },
      {
        id: roomIds[3]!,
        branchId: branchA,
        name: 'Female',
        maximumCapacity: 1,
        genderPolicy: 'FEMALE',
        operationalStatus: 'ACTIVE',
      },
      {
        id: roomIds[4]!,
        branchId: branchA,
        name: 'No gender policy',
        maximumCapacity: 1,
        operationalStatus: 'ACTIVE',
      },
      ...roomIds.slice(5).map((id) => ({
        id,
        branchId: branchA,
        name: id,
        maximumCapacity: 1,
        genderPolicy: 'MALE',
        operationalStatus: 'ACTIVE' as const,
      })),
    ],
    skipDuplicates: true,
  });
  await prisma.bed.createMany({
    data: bedIds.map((id, index) => ({
      id,
      roomId: roomIds[index]!,
      name: 'B01',
      monthlyRent: '1000000.00',
      operationalStatus: 'ACTIVE' as const,
    })),
    skipDuplicates: true,
  });
  await prisma.bedAllocation.createMany({
    data: [
      {
        id: allocationIds[0]!,
        bedId: bedIds[5]!,
        allocationType: 'HELD' as const,
      },
      {
        id: allocationIds[1]!,
        bedId: bedIds[6]!,
        allocationType: 'DEPOSITED' as const,
      },
      {
        id: allocationIds[2]!,
        bedId: bedIds[7]!,
        allocationType: 'OCCUPIED' as const,
      },
    ].map((allocation) => ({
      ...allocation,
      status: 'ACTIVE' as const,
      startedAt: new Date(),
    })),
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma.requestMember.deleteMany({
    where: { rentalRequestId: { in: requestIds } },
  });
  await prisma.rentalRequest.deleteMany({ where: { id: { in: requestIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.bedAllocation.deleteMany({
    where: { id: { in: allocationIds } },
  });
  await prisma.bed.deleteMany({ where: { id: { in: bedIds } } });
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.account.deleteMany({ where: { username: { in: usernames } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await prisma.$disconnect();
});

describe('rental request API', () => {
  it('returns 401 when not authenticated', async () => {
    await request(createApp()).get('/api/v1/rental-requests').expect(401);
  });

  it('forbids ACCOUNTANT and MANAGER from creating requests', async () => {
    const body = {
      customer: { customerType: 'INDIVIDUAL', fullName: 'TST Role' },
      rentalRequest,
    };
    await (
      await signedInAgent('tst-rr-accountant')
    )
      .post('/api/v1/rental-requests')
      .send(body)
      .expect(403);
    await (
      await signedInAgent('tst-rr-manager')
    )
      .post('/api/v1/rental-requests')
      .send(body)
      .expect(403);
  });

  it('creates an individual request in ACTIVE without automatic members', async () => {
    const response = await createIndividual(
      await signedInAgent('tst-rr-sale-a'),
    );

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('ACTIVE');
    expect(response.body.data.preferredArea).toBe('Khu A');
    expect(response.body.data.members).toEqual([]);
  });

  it('returns paginated list metadata and supports sorting', async () => {
    const agent = await signedInAgent('tst-rr-sale-a');
    await createIndividual(agent);
    await createIndividual(agent);

    const response = await agent
      .get(
        '/api/v1/rental-requests?page=1&pageSize=1&sortBy=registeredAt&sortOrder=desc',
      )
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.pageSize).toBe(1);
    expect(response.body.meta.totalItems).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('creates an organization request', async () => {
    const response = await (
      await signedInAgent('tst-rr-sale-a')
    )
      .post('/api/v1/rental-requests')
      .send({
        customer: {
          customerType: 'ORGANIZATION',
          organizationName: 'TST Organization',
          representativeName: 'TST Representative',
          phone: '0911111111',
        },
        rentalRequest,
      });
    requestIds.push(response.body.data.id);
    customerIds.push(response.body.data.representative.id);

    expect(response.status).toBe(201);
    expect(response.body.data.representative.customerType).toBe('ORGANIZATION');
  });

  it('rejects invalid data', async () => {
    const response = await (
      await signedInAgent('tst-rr-sale-a')
    )
      .post('/api/v1/rental-requests')
      .send({
        customer: { customerType: 'INDIVIDUAL' },
        rentalRequest: { branchId: branchA },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('prevents a SALE from another branch from viewing or editing', async () => {
    const response = await createIndividual(
      await signedInAgent('tst-rr-sale-a'),
    );
    const otherBranchAgent = await signedInAgent('tst-rr-sale-b');

    await otherBranchAgent
      .get(`/api/v1/rental-requests/${response.body.data.id}`)
      .expect(403);
    await otherBranchAgent
      .patch(`/api/v1/rental-requests/${response.body.data.id}`)
      .send({ rentalRequest: { expectedResidents: 3 } })
      .expect(403);
  });

  it('adds, edits, and deletes an individual member', async () => {
    const response = await createIndividual(
      await signedInAgent('tst-rr-sale-a'),
    );
    const agent = await signedInAgent('tst-rr-sale-a');
    const added = await agent
      .post(`/api/v1/rental-requests/${response.body.data.id}/members`)
      .send({
        customer: {
          customerType: 'INDIVIDUAL',
          fullName: 'TST Member',
          phone: '0922222222',
        },
      });
    const memberId = added.body.data.customer.id;
    customerIds.push(memberId);

    expect(added.status).toBe(201);
    expect(added.body.data.participationStatus).toBe('PLANNED');
    await agent
      .patch(
        `/api/v1/rental-requests/${response.body.data.id}/members/${memberId}`,
      )
      .send({
        customer: {
          customerType: 'INDIVIDUAL',
          fullName: 'TST Member Updated',
        },
      })
      .expect(200);
    await agent
      .delete(
        `/api/v1/rental-requests/${response.body.data.id}/members/${memberId}`,
      )
      .expect(204);
  });

  it('closes an ACTIVE request and prevents further edits', async () => {
    const response = await createIndividual(
      await signedInAgent('tst-rr-sale-a'),
    );
    const agent = await signedInAgent('tst-rr-sale-a');
    const closed = await agent.post(
      `/api/v1/rental-requests/${response.body.data.id}/close`,
    );

    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('CLOSED');
    const edited = await agent
      .patch(`/api/v1/rental-requests/${response.body.data.id}`)
      .send({
        rentalRequest: { expectedResidents: 3, preferredArea: 'Khu B' },
      });
    expect(edited.status).toBe(409);
    expect(edited.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('matches rooms deterministically without allocating beds', async () => {
    const agent = await signedInAgent('tst-rr-sale-a');
    const created = await agent.post('/api/v1/rental-requests').send({
      customer: { customerType: 'INDIVIDUAL', fullName: 'TST Search Male' },
      rentalRequest: {
        ...rentalRequest,
        expectedResidents: 1,
        acceptsSharedBeds: true,
        genderRequirement: 'male',
        quietPreference: true,
        livingSchedule: 'Ca đêm',
      },
    });
    requestIds.push(created.body.data.id);
    customerIds.push(created.body.data.representative.id);
    const incomplete = await agent
      .post(`/api/v1/rental-requests/${created.body.data.id}/search-rooms`)
      .expect(422);
    expect(incomplete.body.error.code).toBe('MEMBER_COUNT_INCOMPLETE');
    const member = await agent
      .post(`/api/v1/rental-requests/${created.body.data.id}/members`)
      .send({
        customer: { customerType: 'INDIVIDUAL', fullName: 'TST Search Member' },
      })
      .expect(201);
    customerIds.push(member.body.data.customer.id);
    const allocationCountBefore = await prisma.bedAllocation.count();
    const response = await agent
      .post(`/api/v1/rental-requests/${created.body.data.id}/search-rooms`)
      .expect(200);
    const ids = response.body.data.map(
      (room: { roomId: string }) => room.roomId,
    );

    expect(ids).toEqual([roomIds[0], roomIds[1], roomIds[2]]);
    expect(
      response.body.data.map((room: { matchScore: number }) => room.matchScore),
    ).toEqual([2, 1, 0]);
    expect(ids).not.toContain(roomIds[3]);
    expect(ids).not.toContain(roomIds[4]);
    expect(ids).not.toContain(roomIds[5]);
    expect(ids).not.toContain(roomIds[6]);
    expect(ids).not.toContain(roomIds[7]);
    expect(await prisma.bedAllocation.count()).toBe(allocationCountBefore);
  });

  it('applies ANY and FEMALE gender rules while retaining rooms with unmatched preferences', async () => {
    const agent = await signedInAgent('tst-rr-sale-a');
    for (const genderRequirement of ['ANY', 'FEMALE'] as const) {
      const created = await agent.post('/api/v1/rental-requests').send({
        customer: {
          customerType: 'INDIVIDUAL',
          fullName: `TST Search ${genderRequirement}`,
        },
        rentalRequest: {
          ...rentalRequest,
          expectedResidents: 1,
          acceptsSharedBeds: true,
          genderRequirement,
          preferredArea: 'Không tồn tại',
        },
      });
      requestIds.push(created.body.data.id);
      customerIds.push(created.body.data.representative.id);
      const member = await agent
        .post(`/api/v1/rental-requests/${created.body.data.id}/members`)
        .send({
          customer: {
            customerType: 'INDIVIDUAL',
            fullName: `TST Member ${genderRequirement}`,
          },
        })
        .expect(201);
      customerIds.push(member.body.data.customer.id);
      const response = await agent
        .post(`/api/v1/rental-requests/${created.body.data.id}/search-rooms`)
        .expect(200);
      const ids = response.body.data.map(
        (room: { roomId: string }) => room.roomId,
      );
      if (genderRequirement === 'ANY') {
        expect(ids).toEqual(expect.arrayContaining(roomIds.slice(0, 5)));
      } else {
        expect(ids).toEqual(expect.arrayContaining([roomIds[2], roomIds[3]]));
        expect(ids).not.toContain(roomIds[0]);
        expect(ids).not.toContain(roomIds[4]);
      }
      expect(
        response.body.data.some((room: { unmatchedPreferences: string[] }) =>
          room.unmatchedPreferences.includes('Khu vực chưa phù hợp'),
        ),
      ).toBe(true);
    }
  });
});
