import type { ContractStatus, HandoverStatus } from '../../src/generated/prisma/client.js';
import { serviceCatalog } from './constants.js';
import {
  addDays,
  addHours,
  addMonths,
  amountForBeds,
  byBranch,
  paymentMethod,
  pick,
  type DbClient,
  type SeedContext,
  pad,
} from './helpers.js';

export async function seedContracts(db: DbClient, ctx: SeedContext): Promise<void> {
  const depositsForContracts = ctx.deposits.filter((deposit) => deposit.status === 'DEPOSITED').slice(0, ctx.config.contracts);

  depositsForContracts.forEach((deposit, index) => {
    const startsOn = addDays(ctx.now, -(index % 9) * 30);
    const durationMonths = contractDurationMonths(index);
    const status = contractStatus(index + 1);

    ctx.contracts.push({
      id: `C${pad(index + 1)}`,
      depositId: deposit.id,
      branchId: deposit.branchId,
      saleEmployeeId: deposit.saleEmployeeId,
      status,
      bedIds: deposit.selectedBedIds,
      startsOn,
      endsOn: addMonths(startsOn, durationMonths),
      totalMonthlyRent: amountForBeds(ctx, deposit.selectedBedIds),
    });
  });

  await db.contract.createMany({
    data: ctx.contracts.map((contract, index) => ({
      id: contract.id,
      depositId: contract.depositId,
      saleEmployeeId: contract.saleEmployeeId,
      paperContractNumber: hasPaperContract(contract.status) ? `HD-GIAY-${pad(index + 1)}` : null,
      customerArrived: contract.status !== 'CHECKIN_DRAFT',
      customerArrivedAt: contract.status === 'CHECKIN_DRAFT' ? null : addHours(contract.startsOn, -4),
      signedDate: hasPaperContract(contract.status) ? contract.startsOn : null,
      startsOn: contract.startsOn,
      endsOn: contract.endsOn,
      paymentCycle: 'MONTHLY',
      totalMonthlyRent: contract.totalMonthlyRent,
      paperContractSigned: hasPaperContract(contract.status),
      paperSigningConfirmedAt: hasPaperContract(contract.status) ? addHours(contract.startsOn, -2) : null,
      status: contract.status,
      specialTerms: index === 0 ? 'DEMO-CHECKIN: khach da den, dang cho cap nhat cu tru.' : null,
    })),
    skipDuplicates: true,
  });

  await db.contractBed.createMany({
    data: ctx.contracts.flatMap((contract, contractIndex) =>
      contract.bedIds.map((bedId, bedIndex) => ({
        contractId: contract.id,
        bedId,
        residentCustomerId: pick(ctx.individuals, contractIndex * 4 + bedIndex).id,
        monthlyRentSnapshot: amountForBeds(ctx, [bedId]),
        status: contract.status === 'LIQUIDATED' ? 'ENDED' : 'ACTIVE',
      })),
    ),
    skipDuplicates: true,
  });

  await db.contractService.createMany({
    data: ctx.contracts.flatMap((contract) =>
      serviceCatalog.slice(0, 3).map((service) => ({
        contractId: contract.id,
        serviceId: service.id,
        unitPriceSnapshot: service.unitPrice,
        calculationMethod: 'Theo thang',
        note: 'Dich vu kem hop dong demo.',
      })),
    ),
    skipDuplicates: true,
  });

  await seedInitialPayments(db, ctx);
  await seedHandovers(db, ctx);
}

async function seedInitialPayments(db: DbClient, ctx: SeedContext): Promise<void> {
  const contractsWithPayments = ctx.contracts.filter((contract) =>
    ['WAITING_INITIAL_PAYMENT', 'READY_FOR_HANDOVER', 'ACTIVE', 'LIQUIDATED'].includes(contract.status),
  );

  await db.payment.createMany({
    data: contractsWithPayments.map((contract, index) => {
      const accountant = byBranch(ctx.accountantsByBranch, contract.branchId, index);
      const issuedAt = addDays(contract.startsOn, -2);
      const paid = contract.status !== 'WAITING_INITIAL_PAYMENT';

      return {
        id: `IP${pad(index + 1)}`,
        paymentType: 'INITIAL_PAYMENT',
        direction: 'INBOUND',
        amountDue: contract.totalMonthlyRent,
        amountPaid: paid ? contract.totalMonthlyRent : null,
        issuedAt,
        expiresAt: addHours(issuedAt, 48),
        paidAt: paid ? addHours(issuedAt, 8) : null,
        method: paid ? paymentMethod(index) : null,
        transactionReference: paid ? `INIT-${contract.id}` : null,
        receiptNumber: paid ? `PT-IP-${pad(index + 1)}` : null,
        externalEvidenceChecked: paid,
        recordedById: accountant.id,
        confirmedById: null,
        confirmedAt: null,
        rejectionReason: null,
        status: paid ? 'CONFIRMED' : 'WAITING_PAYMENT',
        depositId: null,
        contractId: contract.id,
        settlementId: null,
        note: `Thanh toan ban dau cho ${contract.id}.`,
      };
    }),
    skipDuplicates: true,
  });

  await db.paymentDetail.createMany({
    data: contractsWithPayments.map((contract, index) => ({
      id: `IPD${pad(index + 1)}`,
      paymentId: `IP${pad(index + 1)}`,
      itemType: 'INITIAL_RENT',
      description: `Tien thue ky dau ${contract.id}`,
      quantity: 1,
      unitPrice: contract.totalMonthlyRent,
      amount: contract.totalMonthlyRent,
    })),
    skipDuplicates: true,
  });
}

async function seedHandovers(db: DbClient, ctx: SeedContext): Promise<void> {
  const handoverContracts = ctx.contracts
    .filter((contract) => ['READY_FOR_HANDOVER', 'ACTIVE', 'LIQUIDATED'].includes(contract.status))
    .slice(0, ctx.config.handovers);

  handoverContracts.forEach((contract, index) => {
    ctx.handovers.push({
      id: `H${pad(index + 1)}`,
      contractId: contract.id,
      status: index === 0 ? 'DRAFT' : handoverStatus(contract.status),
    });
  });

  await db.handover.createMany({
    data: ctx.handovers.map((handover, index) => {
      const contract = ctx.contracts.find((item) => item.id === handover.contractId);
      if (!contract) {
        throw new Error(`Missing contract for handover ${handover.id}.`);
      }

      const manager = byBranch(ctx.managersByBranch, contract.branchId, index);

      return {
        id: handover.id,
        contractId: handover.contractId,
        managerId: manager.id,
        handedOverAt: handover.status === 'COMPLETED' ? addHours(contract.startsOn, 9) : null,
        areaCondition: 'Khu vuc sach, du do dung ban giao.',
        utilitiesGuided: handover.status === 'COMPLETED',
        safetyGuided: handover.status === 'COMPLETED',
        paperRecordSigned: handover.status === 'COMPLETED',
        status: handover.status,
        note: index === 0 ? 'DEMO-HANDOVER: ho so san sang ban giao.' : null,
      };
    }),
    skipDuplicates: true,
  });

  await db.handoverAsset.createMany({
    data: ctx.handovers.flatMap((handover, handoverIndex) => {
      const contract = ctx.contracts.find((item) => item.id === handover.contractId);
      if (!contract) {
        throw new Error(`Missing contract for handover assets ${handover.id}.`);
      }

      const firstBedId = contract.bedIds[0];
      const bed = ctx.beds.find((item) => item.id === firstBedId);
      const roomId = bed?.roomId;
      if (!roomId) {
        return [];
      }

      return [1, 2, 3].map((assetOffset) => ({
        handoverId: handover.id,
        roomAssetId: `RA${pad((Number(roomId.replace('P', '')) - 1) * 5 + assetOffset)}`,
        deliveredQuantity: 1,
        conditionAtHandover: handover.status === 'COMPLETED' ? 'Tot' : 'Cho xac nhan',
        note: `Tai san ban giao demo ${handoverIndex + 1}.`,
      }));
    }),
    skipDuplicates: true,
  });
}

function contractStatus(index: number): ContractStatus {
  const earlyStatuses: ContractStatus[] = [
    'ARRIVED',
    'ACTIVE',
    'ACTIVE',
    'LIQUIDATED',
    'READY_FOR_HANDOVER',
    'WAITING_ELIGIBILITY',
    'PAPER_SIGNED',
    'CHECKIN_DRAFT',
    'ACTIVE',
    'ACTIVE',
    'LIQUIDATED',
    'ACTIVE',
  ];

  if (index <= earlyStatuses.length) {
    return earlyStatuses[index - 1];
  }

  return index % 9 === 0 ? 'LIQUIDATED' : 'ACTIVE';
}

function contractDurationMonths(index: number): number {
  return pick([3, 6, 9, 12], index);
}

function hasPaperContract(status: ContractStatus): boolean {
  return !['CHECKIN_DRAFT', 'ARRIVED', 'WAITING_ELIGIBILITY', 'ELIGIBILITY_APPROVED'].includes(status);
}

function handoverStatus(contractStatusValue: ContractStatus): HandoverStatus {
  return contractStatusValue === 'READY_FOR_HANDOVER' ? 'DRAFT' : 'COMPLETED';
}
