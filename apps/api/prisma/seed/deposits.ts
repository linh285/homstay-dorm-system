import type { DepositStatus, RentalMode } from '../../src/generated/prisma/client.js';
import { PaymentStatus } from '../../src/shared/payment-status.js';
import {
  addDays,
  addHours,
  amountForBeds,
  byBranch,
  nextBedsForBranch,
  nextWholeRoomBedsForBranch,
  paymentMethod,
  pick,
  type DbClient,
  type SeedContext,
  pad,
} from './helpers.js';

export async function seedDeposits(db: DbClient, ctx: SeedContext): Promise<void> {
  const depositedStart = Math.max(7, ctx.config.deposits - ctx.config.contracts);

  for (let index = 1; index <= ctx.config.deposits; index += 1) {
    const request = pick(ctx.rentalRequests, index + 5);
    const mode = index % 5 === 0 ? 'WHOLE_ROOM' : 'SHARED_BEDS';
    const selectedBeds = selectDepositBeds(ctx, request.branchId, mode, request.expectedResidents);
    const totalRent = amountForBeds(
      ctx,
      selectedBeds.map((bed) => bed.id),
    );

    ctx.deposits.push({
      id: `D${pad(index)}`,
      rentalRequestId: request.id,
      branchId: request.branchId,
      saleEmployeeId: request.saleEmployeeId,
      status: depositStatus(index, depositedStart),
      rentalMode: mode,
      selectedBedIds: selectedBeds.map((bed) => bed.id),
      totalDepositAmount: totalRent * 2,
    });
  }

  await db.rentalRequest.updateMany({
    where: { id: { in: ctx.deposits.map((deposit) => deposit.rentalRequestId) } },
    data: { status: 'DEPOSIT_PROCESS' },
  });

  await db.deposit.createMany({
    data: ctx.deposits.map((deposit, index) => {
      const issuedAt = addDays(ctx.now, -(index % 12));
      const status = deposit.status;
      const manager = byBranch(ctx.managersByBranch, deposit.branchId, index);

      return {
        id: deposit.id,
        rentalRequestId: deposit.rentalRequestId,
        saleEmployeeId: deposit.saleEmployeeId,
        createdAt: issuedAt,
        rentalModeSnapshot: deposit.rentalMode,
        customerAgreedToRules: status !== 'DRAFT',
        customerAgreedAt: status === 'DRAFT' ? null : addHours(issuedAt, 1),
        roomConfirmedById: roomConfirmedStatus(status) ? manager.id : null,
        roomConfirmedAt: roomConfirmedStatus(status) ? addHours(issuedAt, 2) : null,
        roomRejectionReason: status === 'ROOM_REJECTED' ? 'Phong khong con phu hop tai thoi diem duyet.' : null,
        totalDepositAmount: deposit.totalDepositAmount,
        scheduledCheckInAt: status === 'DEPOSITED' ? addDays(ctx.now, 5 + (index % 5)) : null,
        status,
        note: depositNote(deposit.id, status),
      };
    }),
    skipDuplicates: true,
  });

  await db.depositDetail.createMany({
    data: ctx.deposits.flatMap((deposit) =>
      deposit.selectedBedIds.map((bedId) => {
        const rent = amountForBeds(ctx, [bedId]);

        return {
          depositId: deposit.id,
          bedId,
          monthlyRentSnapshot: rent,
          depositMonths: 2,
          depositAmount: rent * 2,
        };
      }),
    ),
    skipDuplicates: true,
  });

  await seedDepositPayments(db, ctx);
}

async function seedDepositPayments(db: DbClient, ctx: SeedContext): Promise<void> {
  const payableDeposits = ctx.deposits.filter(
    (deposit) => deposit.status !== 'DRAFT' && deposit.status !== 'WAITING_ROOM_CHECK' && deposit.status !== 'ROOM_REJECTED',
  );

  await db.payment.createMany({
    data: payableDeposits.map((deposit, index) => {
      const accountant = byBranch(ctx.accountantsByBranch, deposit.branchId, index);
      const manager = byBranch(ctx.managersByBranch, deposit.branchId, index);
      const issuedAt = addDays(ctx.now, -(index % 10));
      const expiresAt =
        deposit.id === 'D002'
          ? addHours(ctx.now, 1)
          : deposit.id === 'D003'
            ? addHours(ctx.now, -2)
            : addHours(issuedAt, 24);
      const status = paymentStatusForDeposit(deposit.status);
      const paidAt = paymentPaidAt(status, issuedAt, expiresAt);

      return {
        id: `PM${deposit.id.replace('D', '')}`,
        paymentType: 'DEPOSIT',
        direction: 'INBOUND',
        amountDue: deposit.totalDepositAmount,
        amountPaid: paidAt ? deposit.totalDepositAmount : null,
        issuedAt,
        expiresAt,
        paidAt,
        method: paidAt ? paymentMethod(index) : null,
        transactionReference: paidAt ? `VCB-DEMO-${deposit.id}` : null,
        receiptNumber: paidAt ? `PT${deposit.id.replace('D', '')}` : null,
        externalEvidenceChecked: paidAt !== null && status !== PaymentStatus.PAYMENT_RECHECK,
        recordedById: accountant.id,
        confirmedById: status === 'CONFIRMED' || status === PaymentStatus.PAYMENT_REJECTED ? manager.id : null,
        confirmedAt: status === 'CONFIRMED' || status === PaymentStatus.PAYMENT_REJECTED ? addHours(ctx.now, -1) : null,
        rejectionReason: status === PaymentStatus.PAYMENT_REJECTED ? 'Giao dich khong hop le.' : null,
        status,
        depositId: deposit.id,
        contractId: null,
        settlementId: null,
        note: `Thanh toan demo cho ${deposit.id}.`,
      };
    }),
    skipDuplicates: true,
  });

  await db.paymentDetail.createMany({
    data: payableDeposits.map((deposit) => ({
      id: `PMD${deposit.id.replace('D', '')}`,
      paymentId: `PM${deposit.id.replace('D', '')}`,
      itemType: 'DEPOSIT',
      description: `Tien coc ${deposit.id}`,
      quantity: 1,
      unitPrice: deposit.totalDepositAmount,
      amount: deposit.totalDepositAmount,
    })),
    skipDuplicates: true,
  });
}

function selectDepositBeds(ctx: SeedContext, branchId: string, mode: RentalMode, expectedResidents: number) {
  if (mode === 'WHOLE_ROOM') {
    return nextWholeRoomBedsForBranch(ctx, branchId);
  }

  return nextBedsForBranch(ctx, branchId, Math.max(1, Math.min(2, expectedResidents)));
}

function depositStatus(index: number, depositedStart: number): DepositStatus {
  if (index === 1 || index === 2 || index === 3) {
    return 'WAITING_PAYMENT';
  }

  if (index === 4) {
    return 'WAITING_MANAGER_CONFIRMATION';
  }

  if (index === 5) {
    return 'PAYMENT_RECHECK';
  }

  if (index === 6) {
    return 'PAYMENT_REJECTED';
  }

  if (index >= depositedStart) {
    return 'DEPOSITED';
  }

  return pick(
    ['DRAFT', 'WAITING_ROOM_CHECK', 'ROOM_APPROVED', 'ROOM_REJECTED', 'EXPIRED', 'CANCELLED'],
    index,
  ) as DepositStatus;
}

function paymentStatusForDeposit(status: DepositStatus): string {
  if (status === 'WAITING_PAYMENT') {
    return PaymentStatus.WAITING_PAYMENT;
  }

  if (status === 'WAITING_MANAGER_CONFIRMATION') {
    return PaymentStatus.WAITING_MANAGER_CONFIRMATION;
  }

  if (status === 'PAYMENT_RECHECK') {
    return PaymentStatus.PAYMENT_RECHECK;
  }

  if (status === 'PAYMENT_REJECTED') {
    return PaymentStatus.PAYMENT_REJECTED;
  }

  if (status === 'EXPIRED') {
    return PaymentStatus.EXPIRED;
  }

  if (status === 'CANCELLED') {
    return PaymentStatus.CANCELLED;
  }

  return 'CONFIRMED';
}

function paymentPaidAt(status: string, issuedAt: Date, expiresAt: Date): Date | null {
  if (status === PaymentStatus.WAITING_PAYMENT || status === PaymentStatus.EXPIRED || status === PaymentStatus.CANCELLED) {
    return null;
  }

  return addHours(issuedAt, Math.min(12, Math.max(1, Math.floor((expiresAt.getTime() - issuedAt.getTime()) / 7200000))));
}

function roomConfirmedStatus(status: DepositStatus): boolean {
  return !['DRAFT', 'WAITING_ROOM_CHECK'].includes(status);
}

function depositNote(id: string, status: DepositStatus): string | null {
  if (id === 'D001') {
    return 'DEMO-DEPOSIT-WAITING: dang cho thanh toan, con han.';
  }

  if (id === 'D002') {
    return 'DEMO-DEPOSIT-EXPIRING: sap het han 24 gio.';
  }

  if (id === 'D005') {
    return 'DEMO-PAYMENT-RECHECK: da thanh toan dung han, can kiem tra lai.';
  }

  if (id === 'D004') {
    return 'DEMO-DEPOSIT-APPROVAL: Manager co the xac nhan tien coc.';
  }

  if (status === 'PAYMENT_REJECTED') {
    return 'Payment rejected, allocation HELD da ket thuc.';
  }

  return null;
}
