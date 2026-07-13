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

type DemoSettlement = 'SIX_MONTHS' | 'REFUND' | 'EXTRA' | 'ZERO';

type CheckoutPlan = {
  id: string;
  depositId: string;
  contractId: string | null;
  branchId: string;
  status: CheckoutStatus;
  checkoutNote: string | null;
  demo: DemoSettlement | null;
};

// Statuses that mean an inspection record exists (contract checkouts only).
const INSPECTED_STATUSES: CheckoutStatus[] = [
  'WAITING_INSPECTION',
  'INSPECTED',
  'WAITING_SETTLEMENT',
  'WAITING_CUSTOMER_CONFIRMATION',
  'DISPUTED',
  'WAITING_FINANCIAL_COMPLETION',
  'READY_TO_COMPLETE',
  'COMPLETED',
];

// Statuses that mean a settlement record exists (and its status matches).
const SETTLEMENT_STATUSES: CheckoutStatus[] = [
  'WAITING_SETTLEMENT',
  'WAITING_CUSTOMER_CONFIRMATION',
  'DISPUTED',
  'WAITING_FINANCIAL_COMPLETION',
  'READY_TO_COMPLETE',
  'COMPLETED',
];

// A curated status spread applied to the first (primary-branch) checkouts so the
// demo branch always shows every stage, each with consistent related records.
const PRIMARY_STATUS_PLAN: CheckoutStatus[] = [
  'WAITING_INSPECTION',
  'INSPECTED',
  'WAITING_SETTLEMENT',
  'WAITING_CUSTOMER_CONFIRMATION',
  'DISPUTED',
  'WAITING_FINANCIAL_COMPLETION',
  'WAITING_FINANCIAL_COMPLETION',
  'WAITING_FINANCIAL_COMPLETION',
  'READY_TO_COMPLETE',
  'COMPLETED',
  'DRAFT',
];

function hasInspection(plan: CheckoutPlan): boolean {
  return plan.contractId !== null && INSPECTED_STATUSES.includes(plan.status);
}

function hasSettlement(plan: CheckoutPlan): boolean {
  return SETTLEMENT_STATUSES.includes(plan.status);
}

export async function seedCheckouts(db: DbClient, ctx: SeedContext): Promise<void> {
  const primaryBranch = ctx.branches[0]?.id;
  // Put the primary demo branch first so it gets the full curated status spread.
  const orderedContracts = [...ctx.contracts].sort(
    (a, b) =>
      (a.branchId === primaryBranch ? 0 : 1) - (b.branchId === primaryBranch ? 0 : 1),
  );
  const contractCheckouts = orderedContracts.slice(0, Math.max(0, ctx.config.checkouts - 1));
  const noContractDeposit = ctx.deposits.find(
    (deposit) => deposit.status === 'DEPOSITED' && !ctx.contracts.some((contract) => contract.depositId === deposit.id),
  );

  const plans: CheckoutPlan[] = [];

  if (noContractDeposit) {
    plans.push({
      id: 'CO001',
      depositId: noContractDeposit.id,
      contractId: null,
      branchId: noContractDeposit.branchId,
      status: 'WAITING_SETTLEMENT',
      checkoutNote: 'DEMO-CHECKOUT-NO-CONTRACT: chỉ có cọc, áp dụng hoàn 80%.',
      demo: null,
    });
  }

  contractCheckouts.forEach((contract, index) => {
    const status = PRIMARY_STATUS_PLAN[index] ?? checkoutStatus(index);
    plans.push({
      id: `CO${pad(plans.length + 1)}`,
      depositId: contract.depositId,
      contractId: contract.id,
      branchId: contract.branchId,
      status,
      checkoutNote: null,
      demo: null,
    });
  });

  // Tag four primary-branch settlements as the documented DEMO settlement cases.
  tagDemoSettlement(plans, 'WAITING_CUSTOMER_CONFIRMATION', 'SIX_MONTHS');
  tagDemoSettlement(plans, 'WAITING_FINANCIAL_COMPLETION', 'REFUND');
  tagDemoSettlement(plans, 'WAITING_FINANCIAL_COMPLETION', 'EXTRA');
  tagDemoSettlement(plans, 'WAITING_FINANCIAL_COMPLETION', 'ZERO');

  ctx.checkouts.push(
    ...plans.map((plan) => ({
      id: plan.id,
      depositId: plan.depositId,
      contractId: plan.contractId,
      branchId: plan.branchId,
      status: plan.status,
    })),
  );

  await db.checkoutRequest.createMany({
    data: plans.map((plan, index) => {
      const sale = byBranch(ctx.salesByBranch, plan.branchId, index);
      const requestedAt = addDays(ctx.now, -(index + 1));

      return {
        id: plan.id,
        depositId: plan.depositId,
        contractId: plan.contractId,
        saleEmployeeId: sale.id,
        requestedAt,
        expectedCheckoutAt: addDays(requestedAt, 7),
        actualCheckoutAt: ['READY_TO_COMPLETE', 'COMPLETED'].includes(plan.status) ? addDays(requestedAt, 8) : null,
        reason: index % 2 === 0 ? 'Kết thúc nhu cầu lưu trú.' : 'Chuyển địa điểm làm việc.',
        status: plan.status,
        note: plan.checkoutNote,
      };
    }),
    skipDuplicates: true,
  });

  await seedInspections(db, ctx, plans);
  await seedSettlements(db, ctx, plans);
}

function tagDemoSettlement(plans: CheckoutPlan[], status: CheckoutStatus, demo: DemoSettlement): void {
  const target = plans.find((plan) => plan.status === status && plan.contractId !== null && plan.demo === null);
  if (target) {
    target.demo = demo;
  }
}

async function seedInspections(db: DbClient, ctx: SeedContext, plans: CheckoutPlan[]): Promise<void> {
  const inspectable = plans.filter(hasInspection);

  await db.checkoutInspection.createMany({
    data: inspectable.map((plan, index) => {
      const manager = byBranch(ctx.managersByBranch, plan.branchId, index);

      return {
        id: `CI${pad(index + 1)}`,
        checkoutRequestId: plan.id,
        managerId: manager.id,
        inspectedAt: addHours(ctx.now, -(index + 8)),
        sanitationCondition: index % 4 === 0 ? 'Cần vệ sinh bổ sung' : 'Đạt',
        areaCondition: index % 5 === 0 ? 'Có hư hỏng nhỏ' : 'Tốt',
        status: plan.status === 'WAITING_INSPECTION' ? 'DRAFT' : 'COMPLETED',
        note: 'Biên bản kiểm tra trả phòng demo.',
      };
    }),
    skipDuplicates: true,
  });

  await db.checkoutInspectionItem.createMany({
    data: inspectable.flatMap((plan, checkoutIndex) =>
      Array.from({ length: 2 }, (_unused, itemIndex) => ({
        id: `CII${pad(checkoutIndex * 2 + itemIndex + 1)}`,
        inspectionId: `CI${pad(checkoutIndex + 1)}`,
        roomAssetId: roomAssetIdForCheckout(ctx, plan.contractId, itemIndex),
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

async function seedSettlements(db: DbClient, ctx: SeedContext, plans: CheckoutPlan[]): Promise<void> {
  const settlementPlans = plans.filter(hasSettlement);
  const settlementRows = settlementPlans.map((plan, index) => buildSettlement(ctx, plan, index));

  await db.settlement.createMany({
    data: settlementRows.map((settlement) => ({
      id: settlement.id,
      checkoutRequestId: settlement.plan.id,
      accountantId: settlement.accountantId,
      originalDepositAmount: settlement.originalDepositAmount,
      refundRate: settlement.refundRate,
      baseRefundAmount: settlement.baseRefundAmount,
      totalDeductions: settlement.totalDeductions,
      finalBalance: settlement.finalBalance,
      result: settlementResult(settlement.finalBalance),
      customerConfirmedById: settlement.customerConfirmedById,
      customerAgreedAt: settlement.customerConfirmedById ? addHours(ctx.now, -2) : null,
      disputeContent: settlement.plan.status === 'DISPUTED' ? 'Khách yêu cầu kiểm tra lại phí khấu trừ.' : null,
      paperCheckoutSigned: ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.plan.status),
      contractLiquidated: settlement.plan.status === 'COMPLETED',
      keysRecovered: settlement.plan.status === 'COMPLETED',
      customerLeft: settlement.plan.status === 'COMPLETED',
      // The settlement always mirrors its checkout's stage.
      status: settlement.plan.status,
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

  // Money is only recorded once the settlement is at/after READY_TO_COMPLETE.
  const paidSettlements = settlementRows.filter(
    (settlement) =>
      settlement.finalBalance !== 0 && ['READY_TO_COMPLETE', 'COMPLETED'].includes(settlement.plan.status),
  );

  await db.payment.createMany({
    data: paidSettlements.map((settlement, index) => {
      const type = settlement.finalBalance > 0 ? 'DEPOSIT_REFUND' : 'CHECKOUT_ADDITIONAL_PAYMENT';
      const amount = Math.abs(settlement.finalBalance);

      return {
        id: `SP${pad(index + 1)}`,
        paymentType: type,
        direction: paymentDirection(type),
        amountDue: amount,
        amountPaid: amount,
        issuedAt: addDays(ctx.now, -1),
        expiresAt: addDays(ctx.now, 1),
        paidAt: ctx.now,
        method: paymentMethod(index),
        transactionReference: `SETTLE-${settlement.id}`,
        receiptNumber: `SPT${pad(index + 1)}`,
        externalEvidenceChecked: true,
        recordedById: settlement.accountantId,
        confirmedById: null,
        confirmedAt: null,
        rejectionReason: null,
        status: 'CONFIRMED',
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
      'WAITING_SETTLEMENT',
      'WAITING_CUSTOMER_CONFIRMATION',
      'INSPECTED',
      'WAITING_FINANCIAL_COMPLETION',
      'READY_TO_COMPLETE',
      'COMPLETED',
      'DISPUTED',
      'WAITING_INSPECTION',
      'DRAFT',
    ],
    index,
  ) as CheckoutStatus;
}

function buildSettlement(ctx: SeedContext, plan: CheckoutPlan, index: number) {
  const deposit = ctx.deposits.find((item) => item.id === plan.depositId);
  if (!deposit) {
    throw new Error(`Missing deposit for settlement ${plan.id}.`);
  }

  const accountant = byBranch(ctx.accountantsByBranch, plan.branchId, index);
  const manager = byBranch(ctx.managersByBranch, plan.branchId, index);
  const refundRate = settlementRefundRate(plan);
  const baseRefundAmount = Math.floor((deposit.totalDepositAmount * refundRate) / 100);
  const targetBalance = settlementTargetBalance(plan, index, baseRefundAmount);
  const totalDeductions = Math.max(0, baseRefundAmount - targetBalance);
  const customerConfirmed = ['WAITING_FINANCIAL_COMPLETION', 'READY_TO_COMPLETE', 'COMPLETED'].includes(plan.status);

  return {
    id: `S${pad(index + 1)}`,
    plan,
    accountantId: accountant.id,
    originalDepositAmount: deposit.totalDepositAmount,
    refundRate,
    baseRefundAmount,
    totalDeductions,
    finalBalance: baseRefundAmount - totalDeductions,
    customerConfirmedById: customerConfirmed ? manager.id : null,
    deductionCount: index % 3 === 0 ? 1 : 2,
    note: settlementNote(plan.demo),
  };
}

function settlementRefundRate(plan: CheckoutPlan): number {
  if (plan.contractId === null) {
    return 80;
  }
  if (plan.demo === 'SIX_MONTHS') {
    return 50;
  }
  if (plan.demo === 'REFUND') {
    return 70;
  }
  return 100;
}

function settlementTargetBalance(plan: CheckoutPlan, index: number, baseRefundAmount: number): number {
  if (plan.demo === 'EXTRA') {
    return -350000;
  }
  if (plan.demo === 'ZERO') {
    return 0;
  }
  if (plan.demo === 'REFUND' || plan.demo === 'SIX_MONTHS') {
    return Math.floor(baseRefundAmount * 0.75);
  }
  return Math.floor(baseRefundAmount * 0.5);
}

function settlementNote(demo: DemoSettlement | null): string | null {
  switch (demo) {
    case 'SIX_MONTHS':
      return 'DEMO-SETTLEMENT-6-MONTHS: ở đúng 6 tháng, hoàn 50%.';
    case 'REFUND':
      return 'DEMO-SETTLEMENT-REFUND: có số tiền cần hoàn.';
    case 'EXTRA':
      return 'DEMO-SETTLEMENT-EXTRA: có số tiền cần thu thêm.';
    case 'ZERO':
      return 'DEMO-SETTLEMENT-ZERO: số dư bằng 0.';
    default:
      return null;
  }
}

function roomAssetIdForCheckout(ctx: SeedContext, contractId: string | null, itemIndex: number): string | null {
  const contract = ctx.contracts.find((item) => item.id === contractId);
  const firstBed = ctx.beds.find((bed) => bed.id === contract?.bedIds[0]);
  if (!firstBed) {
    return null;
  }

  return `RA${pad((Number(firstBed.roomId.replace('P', '')) - 1) * 5 + itemIndex + 1)}`;
}
