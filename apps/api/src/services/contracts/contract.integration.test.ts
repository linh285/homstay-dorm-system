import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../data/prisma/client.js';

const password = 'ContractTest123!';
const branchA = 'TST-CT-A';
const branchB = 'TST-CT-B';
const users = [
  {
    id: 'TST-CT-SALE',
    username: 'tst-ct-sale',
    role: 'SALE',
    branchId: branchA,
  },
  {
    id: 'TST-CT-ACC',
    username: 'tst-ct-acc',
    role: 'ACCOUNTANT',
    branchId: branchA,
  },
  {
    id: 'TST-CT-MGR',
    username: 'tst-ct-mgr',
    role: 'MANAGER',
    branchId: branchA,
  },
  {
    id: 'TST-CT-MGR-B',
    username: 'tst-ct-mgr-b',
    role: 'MANAGER',
    branchId: branchB,
  },
] as const;
const roomId = 'TST-CT-ROOM';
const depositedBedIds = ['TST-CT-BED-1', 'TST-CT-BED-2'];
const outsideDepositBedId = 'TST-CT-BED-3';
const bedIds = [...depositedBedIds, outsideDepositBedId];
const repId = 'TST-CT-REP';
const memberIds = ['TST-CT-M1', 'TST-CT-M2'];
const requestId = 'TST-CT-REQ';
const depositId = 'TST-CT-DEP';
const soloRepId = 'TST-CT-SOLO-REP';
const soloRequestId = 'TST-CT-SOLO-REQ';
const soloDepositId = 'TST-CT-SOLO-DEP';

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
      { id: branchA, name: 'Contract A', address: 'Test', status: 'ACTIVE' },
      { id: branchB, name: 'Contract B', address: 'Test', status: 'ACTIVE' },
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
      name: 'Contract Room',
      maximumCapacity: 3,
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
  await prisma.customer.createMany({
    data: [
      { id: repId, customerType: 'INDIVIDUAL', fullName: 'Rep Customer' },
      { id: memberIds[0]!, customerType: 'INDIVIDUAL', fullName: 'Member One' },
      { id: memberIds[1]!, customerType: 'INDIVIDUAL', fullName: 'Member Two' },
      {
        id: soloRepId,
        customerType: 'INDIVIDUAL',
        fullName: 'Solo Representative',
      },
    ],
  });
  await prisma.rentalRequest.create({
    data: {
      id: requestId,
      representativeId: repId,
      branchId: branchA,
      saleEmployeeId: users[0].id,
      registeredAt: new Date(),
      expectedResidents: 2,
      rentalMode: 'SHARED_BEDS',
      expectedCheckInDate: new Date('2027-01-01'),
      rentalDurationMonths: 12,
      status: 'DEPOSIT_PROCESS',
      members: {
        create: memberIds.map((customerId) => ({
          customerId,
          participationStatus: 'PLANNED',
          eligibilityResult: 'NOT_REVIEWED',
        })),
      },
    },
  });
  await prisma.deposit.create({
    data: {
      id: depositId,
      rentalRequestId: requestId,
      saleEmployeeId: users[0].id,
      createdAt: new Date(),
      rentalModeSnapshot: 'SHARED_BEDS',
      totalDepositAmount: '12000000.00',
      status: 'DEPOSITED',
      scheduledCheckInAt: new Date('2027-01-05T01:00:00.000Z'),
      details: {
        create: depositedBedIds.map((bedId) => ({
          bedId,
          monthlyRentSnapshot: '3000000.00',
          depositMonths: 2,
          depositAmount: '6000000.00',
        })),
      },
      allocations: {
        create: depositedBedIds.map((bedId, index) => ({
          id: `TST-CT-ALC-${index}`,
          bedId,
          allocationType: 'DEPOSITED',
          status: 'ACTIVE',
          startedAt: new Date(),
        })),
      },
    },
  });
  await prisma.rentalRequest.create({
    data: {
      id: soloRequestId,
      representativeId: soloRepId,
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
      id: soloDepositId,
      rentalRequestId: soloRequestId,
      saleEmployeeId: users[0].id,
      createdAt: new Date(),
      rentalModeSnapshot: 'SHARED_BEDS',
      totalDepositAmount: '6000000.00',
      status: 'DEPOSITED',
      scheduledCheckInAt: new Date('2027-01-05T01:00:00.000Z'),
      details: {
        create: {
          bedId: outsideDepositBedId,
          monthlyRentSnapshot: '3000000.00',
          depositMonths: 2,
          depositAmount: '6000000.00',
        },
      },
      allocations: {
        create: {
          id: 'TST-CT-SOLO-ALC',
          bedId: outsideDepositBedId,
          allocationType: 'DEPOSITED',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      },
    },
  });
});

afterAll(async () => {
  const depositIds = [depositId, soloDepositId];
  const rentalRequestIds = [requestId, soloRequestId];
  await prisma.bedAllocation.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.paymentDetail.deleteMany({
    where: { payment: { contract: { depositId: { in: depositIds } } } },
  });
  await prisma.payment.deleteMany({
    where: { contract: { depositId: { in: depositIds } } },
  });
  await prisma.handoverAsset.deleteMany({
    where: { handover: { contract: { depositId: { in: depositIds } } } },
  });
  await prisma.handover.deleteMany({
    where: { contract: { depositId: { in: depositIds } } },
  });
  await prisma.contractService.deleteMany({
    where: { contract: { depositId: { in: depositIds } } },
  });
  await prisma.contractBed.deleteMany({
    where: { contract: { depositId: { in: depositIds } } },
  });
  await prisma.contract.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.depositDetail.deleteMany({
    where: { depositId: { in: depositIds } },
  });
  await prisma.deposit.deleteMany({ where: { id: { in: depositIds } } });
  await prisma.requestMember.deleteMany({
    where: { rentalRequestId: { in: rentalRequestIds } },
  });
  await prisma.rentalRequest.deleteMany({
    where: { id: { in: rentalRequestIds } },
  });
  await prisma.customer.deleteMany({
    where: { id: { in: [repId, ...memberIds, soloRepId] } },
  });
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

describe('check-in and handover flow', () => {
  it('runs the whole pipeline and activates the contract with occupied beds', async () => {
    const sale = await agentFor(users[0].username);
    const accountant = await agentFor(users[1].username);
    const manager = await agentFor(users[2].username);
    const otherManager = await agentFor(users[3].username);

    const created = await sale.post(
      `/api/v1/contracts/from-deposit/${depositId}`,
    );
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.status).toBe('CHECKIN_DRAFT');
    expect(created.body.data.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ customerId: repId, isRepresentative: true }),
        expect.objectContaining({ customerId: memberIds[0] }),
        expect.objectContaining({ customerId: memberIds[1] }),
      ]),
    );
    expect(
      new Set(
        created.body.data.members.map(
          (member: { customerId: string }) => member.customerId,
        ),
      ).size,
    ).toBe(3);

    await sale
      .post(`/api/v1/contracts/${id}/confirm-arrival`)
      .send({})
      .expect(200);

    const noResidents = await sale.post(
      `/api/v1/contracts/${id}/submit-eligibility-review`,
    );
    expect(noResidents.status).toBe(422);
    expect(noResidents.body.error.code).toBe('NO_RESIDENTS_ASSIGNED');

    const duplicateBed = await sale
      .put(`/api/v1/contracts/${id}/residents`)
      .send({
        residents: [
          {
            customerId: memberIds[0],
            bedId: depositedBedIds[0],
            identityChecked: true,
          },
          {
            customerId: memberIds[1],
            bedId: depositedBedIds[0],
            identityChecked: true,
          },
        ],
      });
    expect(duplicateBed.status).toBe(422);
    expect(duplicateBed.body.error.code).toBe('BED_ASSIGNED_TWICE');

    const outsideDeposit = await sale
      .put(`/api/v1/contracts/${id}/residents`)
      .send({
        residents: [
          {
            customerId: memberIds[0],
            bedId: outsideDepositBedId,
            identityChecked: true,
          },
        ],
      });
    expect(outsideDeposit.status).toBe(422);
    expect(outsideDeposit.body.error.code).toBe('BED_NOT_DEPOSITED');

    await sale
      .put(`/api/v1/contracts/${id}/residents`)
      .send({
        residents: [
          {
            customerId: memberIds[0],
            bedId: depositedBedIds[0],
            identityChecked: true,
          },
          {
            customerId: memberIds[1],
            bedId: depositedBedIds[1],
            identityChecked: true,
          },
        ],
      })
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${id}/submit-eligibility-review`)
      .expect(200);

    // Sale cannot approve residents; cross-branch manager cannot either.
    await sale
      .post(`/api/v1/contracts/${id}/residents/${memberIds[0]}/approve`)
      .send({})
      .expect(403);
    await otherManager
      .post(`/api/v1/contracts/${id}/residents/${memberIds[0]}/approve`)
      .send({})
      .expect(403);

    await manager
      .post(`/api/v1/contracts/${id}/residents/${memberIds[0]}/approve`)
      .send({})
      .expect(200);
    await manager
      .post(`/api/v1/contracts/${id}/residents/${memberIds[1]}/approve`)
      .send({})
      .expect(200);
    await manager
      .post(`/api/v1/contracts/${id}/approve-eligibility`)
      .expect(200);

    // Cannot create initial payment before the paper contract is signed.
    await accountant
      .post(`/api/v1/contracts/${id}/create-initial-payment`)
      .send({
        items: [{ type: 'FIRST_RENT', quantity: 1, unitPrice: '6000000.00' }],
      })
      .expect(409);

    await sale
      .post(`/api/v1/contracts/${id}/record-paper-contract`)
      .send({
        paperContractNumber: 'HD-CT-1',
        signedDate: '2027-01-05',
        startDate: '2027-01-05',
        endDate: '2028-01-04',
        paymentCycle: 'MONTHLY',
      })
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${id}/confirm-paper-signing`)
      .send({ paperContractSigned: true })
      .expect(200);

    await accountant
      .post(`/api/v1/contracts/${id}/create-initial-payment`)
      .send({
        items: [
          {
            type: 'FIRST_RENT',
            description: 'Tiền thuê kỳ đầu',
            quantity: 1,
            unitPrice: '6000000.00',
          },
        ],
      })
      .expect(200);

    // Cannot submit handover before the payment is confirmed.
    await accountant
      .post(`/api/v1/contracts/${id}/submit-handover`)
      .expect(422);

    await accountant
      .post(`/api/v1/contracts/${id}/record-initial-payment`)
      .send({
        amount: '6000000.00',
        method: 'CASH',
        paidAt: new Date().toISOString(),
        externalEvidenceChecked: true,
      })
      .expect(200);
    await accountant
      .post(`/api/v1/contracts/${id}/confirm-initial-payment`)
      .expect(200);
    const ready = await accountant.post(
      `/api/v1/contracts/${id}/submit-handover`,
    );
    expect(ready.status).toBe(200);
    expect(ready.body.data.status).toBe('READY_FOR_HANDOVER');

    // Handover: only manager.
    await accountant
      .post(`/api/v1/contracts/${id}/handovers`)
      .send({})
      .expect(403);
    await otherManager
      .post(`/api/v1/contracts/${id}/handovers`)
      .send({})
      .expect(403);
    const handover = await manager
      .post(`/api/v1/contracts/${id}/handovers`)
      .send({ areaCondition: 'Sạch sẽ' });
    expect(handover.status).toBe(201);
    const handoverId = handover.body.data.id;

    await accountant
      .post(`/api/v1/handovers/${handoverId}/complete`)
      .expect(403);

    // Cannot complete before checklist.
    await manager.post(`/api/v1/handovers/${handoverId}/complete`).expect(422);
    await manager
      .patch(`/api/v1/handovers/${handoverId}`)
      .send({
        utilitiesGuided: true,
        safetyGuided: true,
        paperHandoverSigned: true,
      })
      .expect(200);

    const completed = await manager.post(
      `/api/v1/handovers/${handoverId}/complete`,
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('COMPLETED');

    const contract = await prisma.contract.findUnique({ where: { id } });
    expect(contract?.status).toBe('ACTIVE');
    const allocations = await prisma.bedAllocation.findMany({
      where: { depositId },
    });
    expect(allocations.every((a) => a.allocationType === 'OCCUPIED')).toBe(
      true,
    );
  }, 15_000);

  it('allows an individual representative without request members to be assigned and reviewed', async () => {
    const sale = await agentFor(users[0].username);
    const created = await sale
      .post(`/api/v1/contracts/from-deposit/${soloDepositId}`)
      .expect(201);
    const id = created.body.data.id;
    expect(created.body.data.members).toEqual([
      expect.objectContaining({
        customerId: soloRepId,
        isRepresentative: true,
      }),
    ]);

    await sale
      .post(`/api/v1/contracts/${id}/confirm-arrival`)
      .send({})
      .expect(200);

    const noResidents = await sale.post(
      `/api/v1/contracts/${id}/submit-eligibility-review`,
    );
    expect(noResidents.status).toBe(422);
    expect(noResidents.body.error.code).toBe('NO_RESIDENTS_ASSIGNED');

    await sale
      .put(`/api/v1/contracts/${id}/residents`)
      .send({
        residents: [
          {
            customerId: soloRepId,
            bedId: outsideDepositBedId,
            identityChecked: false,
          },
        ],
      })
      .expect(200);

    const uncheckedIdentity = await sale.post(
      `/api/v1/contracts/${id}/submit-eligibility-review`,
    );
    expect(uncheckedIdentity.status).toBe(422);
    expect(uncheckedIdentity.body.error.code).toBe('IDENTITY_NOT_CHECKED');

    await sale
      .put(`/api/v1/contracts/${id}/residents`)
      .send({
        residents: [
          {
            customerId: soloRepId,
            bedId: outsideDepositBedId,
            identityChecked: true,
          },
        ],
      })
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${id}/submit-eligibility-review`)
      .expect(200);
  });
});
