import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { CheckoutRepository } from '../../data/repositories/checkout.repository.js';
import { SettlementRepository } from '../../data/repositories/settlement.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  additionalPaymentSchema,
  deductionsSchema,
  disputedSchema,
  liquidationSchema,
  refundSchema,
} from '../../presentation/validators/settlement.validator.js';
import type { z } from 'zod';

type DeductionsInput = z.infer<typeof deductionsSchema>;
type DisputedInput = z.infer<typeof disputedSchema>;
type AdditionalPaymentInput = z.infer<typeof additionalPaymentSchema>;
type RefundInput = z.infer<typeof refundSchema>;
type LiquidationInput = z.infer<typeof liquidationSchema>;

type SettlementRecord = NonNullable<
  Awaited<ReturnType<SettlementRepository['findById']>>
>;

/** Calendar day at UTC midnight, so date-only columns and timestamps compare fairly. */
function dayNumber(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addMonthsUtc(date: Date, months: number): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
  );
}

/** Base refund rate as a whole-number percentage per business rules §7. */
export function computeRefundRate(params: {
  hasContract: boolean;
  startsOn?: Date | null;
  endsOn?: Date | null;
  checkoutDate: Date;
}): number {
  if (!params.hasContract) return 80;
  const { startsOn, endsOn, checkoutDate } = params;
  const checkoutDay = dayNumber(checkoutDate);
  if (endsOn && checkoutDay >= dayNumber(endsOn)) return 100;
  if (startsOn) {
    const sixMonths = addMonthsUtc(startsOn, 6);
    return checkoutDay <= sixMonths ? 50 : 70;
  }
  return 50;
}

export class SettlementService {
  constructor(
    private readonly repository = new SettlementRepository(),
    private readonly checkoutRepository = new CheckoutRepository(),
  ) {}

  async get(user: BranchScopedUser, id: string) {
    const settlement = await this.repository.findById(id);
    if (!settlement)
      throw new AppError(404, 'NOT_FOUND', 'Settlement was not found.');
    if (!['ACCOUNTANT', 'MANAGER'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot view this settlement.');
    }
    assertBranchAccess(
      user,
      settlement.checkoutRequest.deposit.rentalRequest.branchId,
    );
    return this.serialize(settlement, user.role);
  }

  async createForCheckout(user: BranchScopedUser, checkoutId: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return withTransaction(async (tx) => {
      const checkout = await this.checkoutRepository.findById(checkoutId, tx);
      if (!checkout)
        throw new AppError(404, 'NOT_FOUND', 'Checkout request was not found.');
      assertBranchAccess(user, checkout.deposit.rentalRequest.branchId);
      if (checkout.settlement) {
        throw new AppError(
          409,
          'SETTLEMENT_ALREADY_EXISTS',
          'A settlement already exists.',
        );
      }
      const hasContract = Boolean(checkout.contractId);
      if (hasContract && checkout.status !== 'INSPECTED') {
        throw new AppError(
          422,
          'INSPECTION_NOT_COMPLETE',
          'Complete the inspection before settlement.',
        );
      }
      if (!hasContract && checkout.status !== 'DRAFT') {
        throw new AppError(
          422,
          'INVALID_STATE_FOR_SETTLEMENT',
          'A deposit-only settlement can only be created from a draft checkout.',
        );
      }
      const checkoutDate = checkout.expectedCheckoutAt ?? new Date();
      const rate = computeRefundRate({
        hasContract,
        startsOn: checkout.contract?.startsOn ?? null,
        endsOn: checkout.contract?.endsOn ?? null,
        checkoutDate,
      });
      const original = new Prisma.Decimal(checkout.deposit.totalDepositAmount);
      const baseRefund = original.mul(rate).div(100);
      const settlement = await this.repository.create(
        {
          id: this.createId('STL'),
          checkoutRequestId: checkoutId,
          accountantId: user.id,
          originalDepositAmount: original,
          refundRate: rate,
          baseRefundAmount: baseRefund,
          totalDeductions: new Prisma.Decimal(0),
          finalBalance: baseRefund,
          result: baseRefund.greaterThan(0)
            ? 'REFUND_TO_CUSTOMER'
            : 'NO_BALANCE',
          status: 'WAITING_SETTLEMENT',
        },
        tx,
      );
      await this.repository.updateCheckoutStatus(
        checkoutId,
        { status: 'WAITING_SETTLEMENT' },
        tx,
      );
      return this.serialize(
        (await this.repository.findById(settlement.id, tx))!,
        user.role,
      );
    });
  }

  async replaceDeductions(
    user: BranchScopedUser,
    id: string,
    input: DeductionsInput,
  ) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['WAITING_SETTLEMENT'], async (tx) => {
      await this.repository.replaceDeductions(
        id,
        input.deductions.map((deduction) => ({
          id: this.createId('DED'),
          settlementId: id,
          feeType: deduction.type,
          description: deduction.description ?? null,
          amount: new Prisma.Decimal(deduction.amount),
          source: deduction.source ?? null,
        })),
        tx,
      );
      await this.recalculate(id, tx);
    });
  }

  async calculate(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['WAITING_SETTLEMENT'], (tx) =>
      this.recalculate(id, tx),
    );
  }

  async finalize(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_SETTLEMENT'],
      async (tx, settlement) => {
        await this.recalculate(id, tx);
        await this.setStatus(settlement, 'WAITING_CUSTOMER_CONFIRMATION', tx);
      },
    );
  }

  async customerAgreed(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_CUSTOMER_CONFIRMATION'],
      async (tx, settlement) => {
        await this.repository.update(
          id,
          { customerConfirmedById: user.id, customerAgreedAt: new Date() },
          tx,
        );
        await this.setStatus(settlement, 'WAITING_FINANCIAL_COMPLETION', tx);
      },
    );
  }

  async disputed(user: BranchScopedUser, id: string, input: DisputedInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_CUSTOMER_CONFIRMATION'],
      async (tx, settlement) => {
        await this.repository.update(id, { disputeContent: input.content }, tx);
        await this.setStatus(settlement, 'DISPUTED', tx);
      },
    );
  }

  async returnToAccountant(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['DISPUTED'], (tx, settlement) =>
      this.setStatus(settlement, 'WAITING_SETTLEMENT', tx),
    );
  }

  async recordAdditionalPayment(
    user: BranchScopedUser,
    id: string,
    input: AdditionalPaymentInput,
  ) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_FINANCIAL_COMPLETION'],
      async (tx, settlement) => {
        if (!settlement.finalBalance.lessThan(0)) {
          throw new AppError(
            422,
            'NO_ADDITIONAL_PAYMENT_DUE',
            'The customer does not owe an additional payment.',
          );
        }
        if (!input.externalEvidenceChecked) {
          throw new AppError(
            422,
            'EVIDENCE_NOT_CHECKED',
            'External evidence must be checked.',
          );
        }
        const owed = settlement.finalBalance.abs();
        if (!new Prisma.Decimal(input.amount).equals(owed)) {
          throw new AppError(
            422,
            'PAYMENT_AMOUNT_MISMATCH',
            'The amount must equal the outstanding balance.',
          );
        }
        await this.repository.createPayment(
          {
            id: this.createId('PAY'),
            paymentType: 'CHECKOUT_ADDITIONAL_PAYMENT',
            direction: 'INBOUND',
            amountDue: owed,
            amountPaid: new Prisma.Decimal(input.amount),
            issuedAt: new Date(),
            paidAt: new Date(input.paidAt),
            method: input.method,
            transactionReference: input.transactionReference ?? null,
            receiptNumber: input.receiptNumber ?? null,
            externalEvidenceChecked: input.externalEvidenceChecked,
            recordedById: user.id,
            settlementId: id,
            status: 'CONFIRMED',
            note: input.note ?? null,
          },
          tx,
        );
        await this.setStatus(settlement, 'READY_TO_COMPLETE', tx);
      },
    );
  }

  async recordRefund(user: BranchScopedUser, id: string, input: RefundInput) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_FINANCIAL_COMPLETION'],
      async (tx, settlement) => {
        if (!settlement.finalBalance.greaterThan(0)) {
          throw new AppError(
            422,
            'NO_REFUND_DUE',
            'The customer is not owed a refund.',
          );
        }
        if (!new Prisma.Decimal(input.amount).equals(settlement.finalBalance)) {
          throw new AppError(
            422,
            'PAYMENT_AMOUNT_MISMATCH',
            'The refund must equal the final balance.',
          );
        }
        await this.repository.createPayment(
          {
            id: this.createId('PAY'),
            paymentType: 'DEPOSIT_REFUND',
            direction: 'OUTBOUND',
            amountDue: settlement.finalBalance,
            amountPaid: new Prisma.Decimal(input.amount),
            issuedAt: new Date(),
            paidAt: new Date(input.paidAt),
            method: input.method,
            transactionReference: input.transactionReference ?? null,
            receiptNumber: input.receiptNumber ?? null,
            externalEvidenceChecked: true,
            recordedById: user.id,
            settlementId: id,
            status: 'CONFIRMED',
            note: input.note ?? null,
          },
          tx,
        );
        await this.setStatus(settlement, 'READY_TO_COMPLETE', tx);
      },
    );
  }

  async confirmNoBalance(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_FINANCIAL_COMPLETION'],
      async (tx, settlement) => {
        if (!settlement.finalBalance.equals(0)) {
          throw new AppError(
            422,
            'BALANCE_NOT_ZERO',
            'The final balance is not zero.',
          );
        }
        await this.setStatus(settlement, 'READY_TO_COMPLETE', tx);
      },
    );
  }

  async confirmLiquidation(
    user: BranchScopedUser,
    id: string,
    input: LiquidationInput,
  ) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['READY_TO_COMPLETE'], (tx) =>
      this.repository.update(
        id,
        {
          paperCheckoutSigned: input.paperCheckoutSigned,
          contractLiquidated: input.contractLiquidated,
          keysRecovered: input.keysRecovered,
          customerLeft: input.customerLeft,
        },
        tx,
      ),
    );
  }

  async completeCheckout(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['READY_TO_COMPLETE'],
      async (tx, settlement) => {
        if (!settlement.customerAgreedAt) {
          throw new AppError(
            422,
            'CUSTOMER_NOT_AGREED',
            'The customer has not agreed to the settlement.',
          );
        }
        if (
          !settlement.paperCheckoutSigned ||
          !settlement.contractLiquidated ||
          !settlement.keysRecovered ||
          !settlement.customerLeft
        ) {
          throw new AppError(
            422,
            'LIQUIDATION_INCOMPLETE',
            'Confirm the signed record, liquidation, key recovery and that the customer left.',
          );
        }
        const financialDone = await this.isFinancialComplete(settlement, tx);
        if (!financialDone) {
          throw new AppError(
            422,
            'FINANCIAL_NOT_COMPLETE',
            'Record the refund or additional payment before completing the checkout.',
          );
        }
        const checkout = settlement.checkoutRequest;
        await this.repository.updateCheckoutStatus(
          checkout.id,
          { status: 'COMPLETED', actualCheckoutAt: new Date() },
          tx,
        );
        if (checkout.contractId) {
          await this.repository.updateContractStatus(
            checkout.contractId,
            'LIQUIDATED',
            tx,
          );
        }
        await this.repository.endAllocations(
          checkout.depositId,
          new Date(),
          tx,
        );
        await this.setStatus(settlement, 'COMPLETED', tx);
      },
    );
  }

  private async isFinancialComplete(
    settlement: SettlementRecord,
    tx: Parameters<SettlementRepository['findById']>[1],
  ) {
    const fresh = await this.repository.findById(settlement.id, tx);
    if (!fresh) return false;
    if (fresh.finalBalance.equals(0)) return true;
    const direction = fresh.finalBalance.greaterThan(0)
      ? 'OUTBOUND'
      : 'INBOUND';
    return fresh.payments.some(
      (payment) =>
        payment.direction === direction && payment.status === 'CONFIRMED',
    );
  }

  private async recalculate(
    id: string,
    tx: Parameters<SettlementRepository['update']>[2],
  ) {
    const settlement = await this.repository.findById(id, tx);
    if (!settlement) return;
    const sum = await this.repository.sumDeductions(id, tx);
    const totalDeductions = new Prisma.Decimal(sum._sum.amount ?? 0);
    const finalBalance = settlement.baseRefundAmount.sub(totalDeductions);
    const result = finalBalance.greaterThan(0)
      ? 'REFUND_TO_CUSTOMER'
      : finalBalance.lessThan(0)
        ? 'CUSTOMER_PAYS_ADDITIONAL'
        : 'NO_BALANCE';
    await this.repository.update(
      id,
      { totalDeductions, finalBalance, result },
      tx,
    );
  }

  private async setStatus(
    settlement: SettlementRecord,
    status: SettlementRecord['status'],
    tx: Parameters<SettlementRepository['update']>[2],
  ) {
    await this.repository.update(settlement.id, { status }, tx);
    await this.repository.updateCheckoutStatus(
      settlement.checkoutRequest.id,
      { status },
      tx,
    );
  }

  private async mutate(
    user: BranchScopedUser,
    id: string,
    from: string[],
    action: (
      tx: Parameters<SettlementRepository['update']>[2],
      settlement: SettlementRecord,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const settlement = await this.repository.findById(id, tx);
      if (!settlement)
        throw new AppError(404, 'NOT_FOUND', 'Settlement was not found.');
      assertBranchAccess(
        user,
        settlement.checkoutRequest.deposit.rentalRequest.branchId,
      );
      if (!from.includes(settlement.status)) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          `This action is not allowed from status ${settlement.status}.`,
        );
      }
      await action(tx, settlement);
      const updated = await this.repository.findById(id, tx);
      return this.serialize(updated!, user.role);
    });
  }

  private requireRole(user: BranchScopedUser, role: string) {
    if (!user.branchId)
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'You must belong to a branch.',
      );
    if (user.role !== role) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Only ${role} can perform this action.`,
      );
    }
  }

  private serialize(settlement: SettlementRecord, role: string) {
    return {
      id: settlement.id,
      status: settlement.status,
      checkoutRequestId: settlement.checkoutRequestId,
      customer: settlement.checkoutRequest.deposit.rentalRequest.representative,
      accountant: settlement.accountant,
      customerConfirmedBy: settlement.customerConfirmedBy,
      originalDepositAmount: settlement.originalDepositAmount.toFixed(2),
      refundRate: settlement.refundRate,
      baseRefundAmount: settlement.baseRefundAmount.toFixed(2),
      totalDeductions: settlement.totalDeductions.toFixed(2),
      finalBalance: settlement.finalBalance.toFixed(2),
      result: settlement.result,
      customerAgreedAt: settlement.customerAgreedAt,
      disputeContent: settlement.disputeContent,
      paperCheckoutSigned: settlement.paperCheckoutSigned,
      contractLiquidated: settlement.contractLiquidated,
      keysRecovered: settlement.keysRecovered,
      customerLeft: settlement.customerLeft,
      deductions: settlement.deductions.map((deduction) => ({
        id: deduction.id,
        feeType: deduction.feeType,
        description: deduction.description,
        amount: deduction.amount.toFixed(2),
        source: deduction.source,
      })),
      payments: settlement.payments.map((payment) => ({
        id: payment.id,
        paymentType: payment.paymentType,
        direction: payment.direction,
        amountPaid: payment.amountPaid ? payment.amountPaid.toFixed(2) : null,
        status: payment.status,
      })),
      availableActions: this.availableActions(settlement, role),
    };
  }

  private availableActions(
    settlement: SettlementRecord,
    role: string,
  ): string[] {
    const status = settlement.status;
    const balance = settlement.finalBalance;
    const financeAction = balance.greaterThan(0)
      ? 'record-refund'
      : balance.lessThan(0)
        ? 'record-additional-payment'
        : 'confirm-no-balance';
    const map: Record<string, Record<string, string[]>> = {
      WAITING_SETTLEMENT: {
        ACCOUNTANT: ['update-deductions', 'calculate', 'finalize'],
      },
      WAITING_CUSTOMER_CONFIRMATION: {
        MANAGER: ['customer-agreed', 'disputed'],
      },
      DISPUTED: { MANAGER: ['return-to-accountant'] },
      WAITING_FINANCIAL_COMPLETION: { ACCOUNTANT: [financeAction] },
      READY_TO_COMPLETE: {
        MANAGER: ['confirm-liquidation', 'complete-checkout'],
      },
    };
    return map[status]?.[role] ?? [];
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }
}
