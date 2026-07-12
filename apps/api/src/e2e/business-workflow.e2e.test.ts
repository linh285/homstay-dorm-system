import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../data/prisma/client.js';

const password = 'E2E-Workflow-Password123!';
const branchId = 'E2E-CN001';
const users = {
  sale: { id: 'E2E-SALE', username: 'e2e-sale', role: 'SALE' as const },
  accountant: {
    id: 'E2E-ACCOUNTANT',
    username: 'e2e-accountant',
    role: 'ACCOUNTANT' as const,
  },
  manager: {
    id: 'E2E-MANAGER',
    username: 'e2e-manager',
    role: 'MANAGER' as const,
  },
};
const roomIds = ['E2E-ROOM-A', 'E2E-ROOM-B'];
const bedIds = ['E2E-BED-A1', 'E2E-BED-A2', 'E2E-BED-B1', 'E2E-BED-B2'];

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
  await prisma.branch.create({
    data: {
      id: branchId,
      name: 'E2E Branch',
      address: 'E2E Address',
      status: 'ACTIVE',
    },
  });
  await prisma.employee.createMany({
    data: Object.values(users).map((user) => ({
      id: user.id,
      fullName: user.username,
      role: user.role,
      branchId,
      status: 'ACTIVE',
    })),
  });
  await prisma.account.createMany({
    data: Object.values(users).map((user) => ({
      username: user.username,
      employeeId: user.id,
      passwordHash,
      status: 'ACTIVE',
    })),
  });
  await prisma.room.create({
    data: {
      id: roomIds[0]!,
      branchId,
      name: 'E2E Room A',
      area: 'E2E Area',
      maximumCapacity: 2,
      genderPolicy: 'ANY',
      hasAirConditioner: true,
      hasParking: true,
      quietLevel: 'HIGH',
      operationalStatus: 'ACTIVE',
      beds: {
        create: [
          {
            id: bedIds[0]!,
            name: 'A1',
            monthlyRent: '1000000.00',
            operationalStatus: 'ACTIVE',
          },
          {
            id: bedIds[1]!,
            name: 'A2',
            monthlyRent: '1000000.00',
            operationalStatus: 'ACTIVE',
          },
        ],
      },
    },
  });
  await prisma.room.create({
    data: {
      id: roomIds[1]!,
      branchId,
      name: 'E2E Room B',
      maximumCapacity: 2,
      genderPolicy: 'ANY',
      operationalStatus: 'ACTIVE',
      beds: {
        create: [
          {
            id: bedIds[2]!,
            name: 'B1',
            monthlyRent: '1500000.00',
            operationalStatus: 'ACTIVE',
          },
          {
            id: bedIds[3]!,
            name: 'B2',
            monthlyRent: '1500000.00',
            operationalStatus: 'ACTIVE',
          },
        ],
      },
    },
  });
});

afterAll(async () => {
  await prisma.paymentDetail.deleteMany({
    where: { payment: { transactionReference: { startsWith: 'E2E-' } } },
  });
  await prisma.payment.deleteMany({
    where: { OR: [{ transactionReference: { startsWith: 'E2E-' } }] },
  });
  await prisma.deduction.deleteMany({
    where: {
      settlement: {
        checkoutRequest: { deposit: { rentalRequest: { branchId } } },
      },
    },
  });
  await prisma.settlement.deleteMany({
    where: { checkoutRequest: { deposit: { rentalRequest: { branchId } } } },
  });
  await prisma.checkoutInspectionItem.deleteMany({
    where: {
      inspection: {
        checkoutRequest: { deposit: { rentalRequest: { branchId } } },
      },
    },
  });
  await prisma.checkoutInspection.deleteMany({
    where: { checkoutRequest: { deposit: { rentalRequest: { branchId } } } },
  });
  await prisma.checkoutRequest.deleteMany({
    where: { deposit: { rentalRequest: { branchId } } },
  });
  await prisma.handoverAsset.deleteMany({
    where: {
      handover: { contract: { deposit: { rentalRequest: { branchId } } } },
    },
  });
  await prisma.handover.deleteMany({
    where: { contract: { deposit: { rentalRequest: { branchId } } } },
  });
  await prisma.contractService.deleteMany({
    where: { contract: { deposit: { rentalRequest: { branchId } } } },
  });
  await prisma.contractBed.deleteMany({
    where: { contract: { deposit: { rentalRequest: { branchId } } } },
  });
  await prisma.contract.deleteMany({
    where: { deposit: { rentalRequest: { branchId } } },
  });
  await prisma.bedAllocation.deleteMany({
    where: { deposit: { rentalRequest: { branchId } } },
  });
  await prisma.depositDetail.deleteMany({
    where: { deposit: { rentalRequest: { branchId } } },
  });
  await prisma.deposit.deleteMany({ where: { rentalRequest: { branchId } } });
  await prisma.viewingDetail.deleteMany({
    where: { viewing: { rentalRequest: { branchId } } },
  });
  await prisma.viewing.deleteMany({ where: { rentalRequest: { branchId } } });
  await prisma.requestMember.deleteMany({
    where: { rentalRequest: { branchId } },
  });
  const requests = await prisma.rentalRequest.findMany({
    where: { branchId },
    select: { representativeId: true },
  });
  await prisma.rentalRequest.deleteMany({ where: { branchId } });
  await prisma.customer.deleteMany({
    where: {
      OR: [
        { id: { in: requests.map((item) => item.representativeId) } },
        { fullName: { startsWith: 'E2E ' } },
      ],
    },
  });
  await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.account.deleteMany({
    where: {
      username: { in: Object.values(users).map((user) => user.username) },
    },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: Object.values(users).map((user) => user.id) } },
  });
  await prisma.branch.deleteMany({ where: { id: branchId } });
  await prisma.$disconnect();
});

describe.sequential('E2E business workflow', () => {
  it('moves a new shared-bed request through deposit, handover and checkout', async () => {
    const sale = await agentFor(users.sale.username);
    const accountant = await agentFor(users.accountant.username);
    const manager = await agentFor(users.manager.username);

    const requestCreated = await sale.post('/api/v1/rental-requests').send({
      customer: {
        customerType: 'INDIVIDUAL',
        fullName: 'E2E Customer',
        phone: '0900000001',
      },
      rentalRequest: {
        branchId,
        expectedResidents: 2,
        rentalMode: 'SHARED_BEDS',
        preferredArea: 'E2E Area',
        maximumBudget: '3000000.00',
        expectedCheckInDate: '2027-01-05',
        rentalDurationMonths: 12,
        genderRequirement: 'ANY',
        requiresAirConditioner: true,
        requiresParking: true,
        quietPreference: true,
        acceptsSharedBeds: true,
        livingSchedule: 'E2E schedule',
      },
    });
    expect(requestCreated.status).toBe(201);
    const rentalRequestId = requestCreated.body.data.id as string;
    expect(requestCreated.body.data.status).toBe('ACTIVE');

    const members = await Promise.all(
      ['E2E Member A', 'E2E Member B'].map((fullName) =>
        sale
          .post(`/api/v1/rental-requests/${rentalRequestId}/members`)
          .send({ customer: { customerType: 'INDIVIDUAL', fullName } }),
      ),
    );
    expect(members.every((member) => member.status === 201)).toBe(true);
    const memberIds = members.map(
      (member) => member.body.data.customer.id as string,
    );

    const allocationsBefore = await prisma.bedAllocation.count();
    const matches = await sale.post(
      `/api/v1/rental-requests/${rentalRequestId}/search-rooms`,
    );
    expect(matches.status).toBe(200);
    expect(matches.body.data[0].roomId).toBe(roomIds[0]);
    expect(await prisma.bedAllocation.count()).toBe(allocationsBefore);

    const viewing = await sale.post('/api/v1/viewings').send({
      rentalRequestId,
      startsAt: '2027-01-01T01:00:00.000Z',
      endsAt: '2027-01-01T02:00:00.000Z',
      roomIds,
      notificationChannel: 'PHONE',
      notificationSent: true,
      note: 'E2E viewing',
    });
    expect(viewing.status).toBe(201);
    const viewingId = viewing.body.data.id as string;
    await sale.post(`/api/v1/viewings/${viewingId}/confirm`).expect(200);
    await sale
      .post(`/api/v1/viewings/${viewingId}/confirm-visited`)
      .send({})
      .expect(200);
    await sale
      .post(`/api/v1/viewings/${viewingId}/result`)
      .send({ result: 'CUSTOMER_WANTS_DEPOSIT', selectedRoomId: roomIds[0] })
      .expect(200);

    const depositCreated = await sale
      .post(`/api/v1/viewings/${viewingId}/create-deposit`)
      .send({ selectedBedIds: bedIds.slice(0, 2) });
    expect(depositCreated.status).toBe(201);
    const depositId = depositCreated.body.data.id as string;
    expect(depositCreated.body.data.status).toBe('DRAFT');
    await sale
      .post(`/api/v1/deposits/${depositId}/confirm-customer-rules`)
      .send({ customerAgreed: true })
      .expect(200);
    await sale
      .post(`/api/v1/deposits/${depositId}/submit-room-check`)
      .expect(200);
    await manager
      .post(`/api/v1/deposits/${depositId}/approve-room`)
      .expect(200);
    const issued = await accountant.post(
      `/api/v1/deposits/${depositId}/issue-payment-request`,
    );
    expect(issued.status).toBe(200);
    expect(issued.body.data.status).toBe('WAITING_PAYMENT');
    expect(issued.body.data.totalDepositAmount).toBe('4000000.00');
    expect(
      issued.body.data.allocations.every(
        (item: { allocationType: string }) => item.allocationType === 'HELD',
      ),
    ).toBe(true);
    await accountant
      .post(`/api/v1/deposits/${depositId}/record-payment`)
      .send({
        amount: '4000000.00',
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        transactionReference: 'E2E-DEPOSIT-PAYMENT',
        externalEvidenceChecked: true,
      })
      .expect(200);
    await manager
      .post(`/api/v1/deposits/${depositId}/approve-payment`)
      .expect(200);
    await sale
      .post(`/api/v1/deposits/${depositId}/schedule-check-in`)
      .send({ checkInAt: '2027-01-05T01:00:00.000Z' })
      .expect(200);

    const contractCreated = await sale.post(
      `/api/v1/contracts/from-deposit/${depositId}`,
    );
    expect(contractCreated.status).toBe(201);
    const contractId = contractCreated.body.data.id as string;
    await sale
      .post(`/api/v1/contracts/${contractId}/confirm-arrival`)
      .send({})
      .expect(200);
    await sale
      .put(`/api/v1/contracts/${contractId}/residents`)
      .send({
        residents: memberIds.map((customerId, index) => ({
          customerId,
          bedId: bedIds[index]!,
          identityChecked: true,
        })),
      })
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${contractId}/submit-eligibility-review`)
      .expect(200);
    for (const customerId of memberIds) {
      await manager
        .post(`/api/v1/contracts/${contractId}/residents/${customerId}/approve`)
        .send({})
        .expect(200);
    }
    await manager
      .post(`/api/v1/contracts/${contractId}/approve-eligibility`)
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${contractId}/record-paper-contract`)
      .send({
        paperContractNumber: 'E2E-HD-001',
        signedDate: '2027-01-05',
        startDate: '2027-01-05',
        endDate: '2028-01-04',
        paymentCycle: 'MONTHLY',
      })
      .expect(200);
    await sale
      .post(`/api/v1/contracts/${contractId}/confirm-paper-signing`)
      .send({ paperContractSigned: true })
      .expect(200);
    await accountant
      .post(`/api/v1/contracts/${contractId}/create-initial-payment`)
      .send({
        items: [
          {
            type: 'FIRST_RENT',
            quantity: 1,
            unitPrice: '2000000.00',
          },
        ],
      })
      .expect(200);
    await accountant
      .post(`/api/v1/contracts/${contractId}/record-initial-payment`)
      .send({
        amount: '2000000.00',
        method: 'CASH',
        paidAt: new Date().toISOString(),
        externalEvidenceChecked: true,
        transactionReference: 'E2E-INITIAL-PAYMENT',
      })
      .expect(200);
    await accountant
      .post(`/api/v1/contracts/${contractId}/confirm-initial-payment`)
      .expect(200);
    await accountant
      .post(`/api/v1/contracts/${contractId}/submit-handover`)
      .expect(200);
    const handover = await manager
      .post(`/api/v1/contracts/${contractId}/handovers`)
      .send({ areaCondition: 'E2E good condition' });
    expect(handover.status).toBe(201);
    const handoverId = handover.body.data.id as string;
    await manager
      .patch(`/api/v1/handovers/${handoverId}`)
      .send({
        utilitiesGuided: true,
        safetyGuided: true,
        paperHandoverSigned: true,
      })
      .expect(200);
    await manager.post(`/api/v1/handovers/${handoverId}/complete`).expect(200);
    expect(
      (await prisma.contract.findUnique({ where: { id: contractId } }))?.status,
    ).toBe('ACTIVE');
    expect(
      (await prisma.bedAllocation.findMany({ where: { depositId } })).every(
        (item) => item.allocationType === 'OCCUPIED',
      ),
    ).toBe(true);

    const checkoutCreated = await sale.post('/api/v1/checkout-requests').send({
      contractId,
      expectedCheckoutAt: '2027-07-05T01:00:00.000Z',
      reason: 'E2E move out',
    });
    expect(checkoutCreated.status).toBe(201);
    const checkoutId = checkoutCreated.body.data.id as string;
    await sale
      .post(`/api/v1/checkout-requests/${checkoutId}/submit`)
      .expect(200);
    const inspection = await manager
      .post(`/api/v1/checkout-requests/${checkoutId}/inspection`)
      .send({ sanitationCondition: 'OK', areaCondition: 'E2E checked' });
    expect(inspection.status).toBe(201);
    const checkoutDetail = await manager.get(
      `/api/v1/checkout-requests/${checkoutId}`,
    );
    const inspectionId = checkoutDetail.body.data.inspection.id as string;
    await manager
      .post(`/api/v1/checkout-inspections/${inspectionId}/complete`)
      .expect(200);
    const settlementCreated = await accountant.post(
      `/api/v1/checkout-requests/${checkoutId}/settlement`,
    );
    expect(settlementCreated.status).toBe(201);
    const settlementId = settlementCreated.body.data.id as string;
    await accountant
      .put(`/api/v1/settlements/${settlementId}/deductions`)
      .send({
        deductions: [
          { type: 'E2E_OTHER', amount: '500000.00', source: 'MANUAL' },
        ],
      })
      .expect(200);
    const finalized = await accountant.post(
      `/api/v1/settlements/${settlementId}/finalize`,
    );
    expect(finalized.status).toBe(200);
    expect(finalized.body.data.result).toBe('REFUND_TO_CUSTOMER');
    const refundAmount = finalized.body.data.finalBalance as string;
    await manager
      .post(`/api/v1/settlements/${settlementId}/customer-agreed`)
      .expect(200);
    await accountant
      .post(`/api/v1/settlements/${settlementId}/record-refund`)
      .send({
        amount: refundAmount,
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        transactionReference: 'E2E-REFUND',
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

    expect(
      (await prisma.checkoutRequest.findUnique({ where: { id: checkoutId } }))
        ?.status,
    ).toBe('COMPLETED');
    expect(
      (await prisma.contract.findUnique({ where: { id: contractId } }))?.status,
    ).toBe('LIQUIDATED');
    expect(
      (await prisma.bedAllocation.findMany({ where: { depositId } })).every(
        (item) => item.status === 'ENDED',
      ),
    ).toBe(true);
  }, 30_000);
});
