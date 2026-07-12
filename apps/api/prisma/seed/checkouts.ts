import type { CheckoutStatus } from '../../src/generated/prisma/client.js';
import {
  addDays,
  addHours,
  byBranch,
  deductionSource,
  inspectionResult,
  paymentDirection,
  paymentMethod,
  settlementResult,
  type DbClient,
  type SeedContext,
  pad,
  pick,
} from './helpers.js';

export async function seedCheckouts(db: DbClient, ctx: SeedContext): Promise<void> {
  const contractCheckouts = ctx.contracts.slice(0, Math.max(0, ctx.config.checkouts - 1));
  const noContractDeposit = ctx.deposits.find(
    (deposit) => deposit.status === 'DEPOSITED' && !ctx.contracts.some((contract) => contract.depositId === deposit.id),
  );

  if (noContractDeposit) {
    ctx.checkouts.push({
      id: 'CO001',
      depositId: noContractDeposit.id,
      contractId: null,
      branchId: noContractDeposit.branchId,
      status: 'WAITING_SETTLEMENT',
    });
  }

  contractCheckouts.forEach((contract, index) => {
    ctx.checkouts.push({
      id: `CO${pad(ctx.checkouts.length + 1)}`,
      depositId: contract.depositId,
      contractId: contract.id,
      branchId: contract.branchId,
      status: checkoutStatus(index),
    });
  });

  await db.checkoutRequest.createMany({
    data: ctx.checkouts.map((checkout, index) => {
      const sale = byBranch(ctx.salesByBranch, checkout.branchId, index);
      const requestedAt = addDays(ctx.now, -(index + 1));

      return {
        id: checkout.id,
        depositId: checkout.depositId,
        contractId: checkout.contractId,
        saleEmployeeId: sale.id,
        requestedAt,
        expectedCheckoutAt: addDays(requestedAt, 7),
        actualCheckoutAt: ['READY_TO_COMPLETE', 'COMPLETED'].includes(checkout.status) ? addDays(requestedAt, 8) : null,
        reason: index % 2 === 0 ? 'Kết thúc nhu cầu lưu trú.' : 'Chuyển địa điểm làm việc.',
        status: checkout.status,
        note: checkout.id === 'CO001' ? 'DEMO-CHECKOUT-NO-CONTRACT: chỉ có cọc, áp dụng hoàn 80%.' : null,
      };
    }),
    skipDuplicates: true,
  });

  await seedInspections(db, ctx);
  await seedSettlements(db, ctx);
}

async function seedInspections(db: DbClient, ctx: SeedContext): Promise<void> {
  const inspectable = ctx.checkouts
    .filter((checkout) => checkout.contractId !== null)
    .slice(0, ctx.config.inspections);

  await db.checkoutInspection.createMany({
    data: inspectable.map((checkout, index) => {
      const manager = byBranch(ctx.managersByBranch, checkout.branchId, index);

      return {
        id: `CI${pad(index + 1)}`,
        checkoutRequestId: checkout.id,
        managerId: manager.id,
        inspectedAt: addHours(ctx.now, -(index + 8)),
        sanitationCondition: index % 4 === 0 ? 'Cần vệ sinh bổ sung' : 'Dat',
        areaCondition: index % 5 === 0 ? 'Có hư hỏng nhỏ' : 'Tốt',
        status: ['INSPECTED', 'WAITING_SETTLEMENT', 'WAITING_CUSTOMER_CONFIRMATION', 'COMPLETED'].includes(
          checkout.status,
        )
          ? 'COMPLETED'
          : 'DRAFT',
        note: 'Biên bản kiểm tra trả phòng demo.',
      };
    }),
    skipDuplicates: true,
  });

  await db.checkoutInspectionItem.createMany({
    data: inspectable.flatMap((checkout, checkoutIndex) =>
      Array.from({ length: 2 }, (_unused, itemIndex) => ({
        id: `CII${pad(checkoutIndex * 2 + itemIndex + 1)}`,
        inspectionId: `CI${pad(checkoutIndex + 1)}`,
        roomAssetId: roomAssetIdForCheckout(ctx, checkout.contractId, itemIndex),
        result: inspectionResult(checkoutIndex + itemIndex),
        quantity: 1,
        description: 'Hạng mục kiểm tra demo.',
        estimatedCost: itemIndex === 0 ? 0 : 150000 + checkoutIndex * 10000,
        note: 'Chi tiết kiểm tra demo.',
      })),
    ),
    skipDuplicates: true,
  });
}

async function seedSettlements(db: DbClient, ctx: SeedContext): Promise<void> {
  const settlementCheckouts = ctx.checkouts.slice(0, ctx.config.settlements);
  const settlementRows = settlementCheckouts.map((checkout, index) => buildSettlement(ctx, checkout, index));

  await db.settlement.createMany({
    data: settlementRows.map((settlement) => ({
      id: settlement.id,
      checkoutRequestId: settlement.checkout.id,
      accountantId: settlement.accountantId,
      originalDepositAmount: settlement.originalDepositAmount,
      refundRate: settlement.refundRate,
      baseRefundAmount: settlement.baseRefundAmount,
      totalDeductions: settlement.totalDeductions,
      finalBalance: settlement.finalBalance,
      result: settlementResult(settlement.finalBalance),
      customerConfirmedById: settlement.customerConfirmedById,
      customerAgreedAt: settlement.customerConfirmedById ? addHours(ctx.now, -2) : null,
      disputeContent: settlement.status === 'DISPUTED' ? 'Khách yêu cầu kiểm tra lại phí khấu trừ.' : null,
      paperCheckoutSigned: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.status),
      contractLiquidated: settlement.status === 'COMPLETED',
      keysRecovered: settlement.status === 'COMPLETED',
      customerLeft: settlement.status === 'COMPLETED',
      status: settlement.status,
      note: settlement.note,
    })),
    skipDuplicates: true,
  });

  await db.deduction.createMany({
    data: settlementRows.flatMap((settlement, settlementIndex) =>
      Array.from({ length: settlement.deductionCount }, (_unused, deductionIndex) => {
        const baseAmount = Math.floor(settlement.totalDeductions / settlement.deductionCount);
        const isLast = deductionIndex === settlement.deductionCount - 1;

        return {
          id: `DED${pad(settlementIndex * 3 + deductionIndex + 1)}`,
          settlementId: settlement.id,
          feeType: pick(['RENT_DEBT', 'WATER_ELECTRIC', 'DAMAGE', 'CLEANING'], deductionIndex),
          description: 'Khoản khấu trừ demo.',
          amount: isLast
            ? settlement.totalDeductions - baseAmount * (settlement.deductionCount - 1)
            : baseAmount,
          source: deductionSource(settlementIndex + deductionIndex),
        };
      }),
    ),
    skipDuplicates: true,
  });

  await db.payment.createMany({
    data: settlementRows
      .filter((settlement) => settlement.finalBalance !== 0)
      .map((settlement, index) => {
        const type = settlement.finalBalance > 0 ? 'DEPOSIT_REFUND' : 'CHECKOUT_ADDITIONAL_PAYMENT';
        const amount = Math.abs(settlement.finalBalance);

        return {
          id: `SP${pad(index + 1)}`,
          paymentType: type,
          direction: paymentDirection(type),
          amountDue: amount,
          amountPaid: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.status) ? amount : null,
          issuedAt: addDays(ctx.now, -1),
          expiresAt: addDays(ctx.now, 1),
          paidAt: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.status) ? ctx.now : null,
          method: paymentMethod(index),
          transactionReference: `SETTLE-${settlement.id}`,
          receiptNumber: `SPT${pad(index + 1)}`,
          externalEvidenceChecked: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.status),
          recordedById: settlement.accountantId,
          confirmedById: null,
          confirmedAt: null,
          rejectionReason: null,
          status: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.status) ? 'CONFIRMED' : 'WAITING_PAYMENT',
          depositId: null,
          contractId: null,
          settlementId: settlement.id,
          note: `Thanh toán đối soát ${settlement.id}.`,
        };
      }),
    skipDuplicates: true,
  });
}

function checkoutStatus(index: number): CheckoutStatus {
  return pick(
    [
      'DRAFT',
      'WAITING_INSPECTION',
      'INSPECTED',
      'WAITING_SETTLEMENT',
      'WAITING_CUSTOMER_CONFIRMATION',
      'DISPUTED',
      'WAITING_FINANCIAL_COMPLETION',
      'READY_TO_COMPLETE',
      'COMPLETED',
    ],
    index,
  ) as CheckoutStatus;
}

function buildSettlement(ctx: SeedContext, checkout: SeedContext['checkouts'][number], index: number) {
  const deposit = ctx.deposits.find((item) => item.id === checkout.depositId);
  if (!deposit) {
    throw new Error(`Missing deposit for settlement ${checkout.id}.`);
  }

  const accountant = byBranch(ctx.accountantsByBranch, checkout.branchId, index);
  const manager = byBranch(ctx.managersByBranch, checkout.branchId, index);
  const refundRate = settlementRefundRate(checkout, index);
  const baseRefundAmount = Math.floor((deposit.totalDepositAmount * refundRate) / 100);
  const targetBalance = settlementTargetBalance(index, baseRefundAmount);
  const totalDeductions = Math.max(0, baseRefundAmount - targetBalance);
  const status = settlementStatus(index);

  return {
    id: `S${pad(index + 1)}`,
    checkout,
    accountantId: accountant.id,
    originalDepositAmount: deposit.totalDepositAmount,
    refundRate,
    baseRefundAmount,
    totalDeductions,
    finalBalance: baseRefundAmount - totalDeductions,
    customerConfirmedById: ['WAITING_FINANCIAL_COMPLETION', 'READY_TO_COMPLETE', 'COMPLETED'].includes(status)
      ? manager.id
      : null,
    status,
    deductionCount: index % 3 === 0 ? 1 : 2,
    note: settlementNote(index + 1),
  };
}

function settlementRefundRate(checkout: SeedContext['checkouts'][number], index: number): number {
  if (checkout.contractId === null) {
    return 80;
  }

  if (index === 1) {
    return 50;
  }

  return pick([50, 70, 100], index);
}

function settlementTargetBalance(index: number, baseRefundAmount: number): number {
  if (index === 3) {
    return -350000;
  }

  if (index === 4) {
    return 0;
  }

  if (index === 2) {
    return Math.floor(baseRefundAmount * 0.75);
  }

  return Math.floor(baseRefundAmount * 0.5);
}

function settlementStatus(index: number): CheckoutStatus {
  if (index === 0) {
    return 'WAITING_SETTLEMENT';
  }

  if (index === 1) {
    return 'WAITING_CUSTOMER_CONFIRMATION';
  }

  if (index === 2 || index === 3 || index === 4) {
    return 'WAITING_FINANCIAL_COMPLETION';
  }

  return pick(['WAITING_CUSTOMER_CONFIRMATION', 'DISPUTED', 'READY_TO_COMPLETE', 'COMPLETED'], index) as CheckoutStatus;
}

function settlementNote(index: number): string | null {
  if (index === 2) {
    return 'DEMO-SETTLEMENT-6-MONTHS: ở đúng 6 tháng, hoàn 50%.';
  }

  if (index === 3) {
    return 'DEMO-SETTLEMENT-REFUND: có số tiền cần hoàn.';
  }

  if (index === 4) {
    return 'DEMO-SETTLEMENT-EXTRA: có số tiền cần thu thêm.';
  }

  if (index === 5) {
    return 'DEMO-SETTLEMENT-ZERO: số dư bằng 0.';
  }

  return null;
}

function roomAssetIdForCheckout(ctx: SeedContext, contractId: string | null, itemIndex: number): string | null {
  const contract = ctx.contracts.find((item) => item.id === contractId);
  const firstBed = ctx.beds.find((bed) => bed.id === contract?.bedIds[0]);
  if (!firstBed) {
    return null;
  }

  return `RA${pad((Number(firstBed.roomId.replace('P', '')) - 1) * 5 + itemIndex + 1)}`;
}
