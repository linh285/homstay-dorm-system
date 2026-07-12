import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const settlementInclude = {
  accountant: { select: { id: true, fullName: true } },
  customerConfirmedBy: { select: { id: true, fullName: true } },
  deductions: { orderBy: { id: 'asc' } },
  payments: { orderBy: { issuedAt: 'asc' } },
  checkoutRequest: {
    select: {
      id: true,
      status: true,
      depositId: true,
      contractId: true,
      deposit: {
        select: {
          totalDepositAmount: true,
          rentalRequest: {
            select: {
              branchId: true,
              representative: {
                select: { id: true, fullName: true, organizationName: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SettlementInclude;

export class SettlementRepository {
  findById(id: string, client: DatabaseClient = prisma) {
    return client.settlement.findUnique({
      where: { id },
      include: settlementInclude,
    });
  }

  create(data: Prisma.SettlementUncheckedCreateInput, client: DatabaseClient) {
    return client.settlement.create({ data, include: settlementInclude });
  }

  update(
    id: string,
    data: Prisma.SettlementUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.settlement.update({
      where: { id },
      data,
      include: settlementInclude,
    });
  }

  async replaceDeductions(
    settlementId: string,
    rows: Prisma.DeductionUncheckedCreateInput[],
    client: TransactionClient,
  ) {
    await client.deduction.deleteMany({ where: { settlementId } });
    if (rows.length) await client.deduction.createMany({ data: rows });
  }

  sumDeductions(settlementId: string, client: DatabaseClient = prisma) {
    return client.deduction.aggregate({
      where: { settlementId },
      _sum: { amount: true },
    });
  }

  updateCheckoutStatus(
    id: string,
    data: Prisma.CheckoutRequestUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.checkoutRequest.update({ where: { id }, data });
  }

  updateContractStatus(
    id: string,
    status: Prisma.ContractUpdateInput['status'],
    client: DatabaseClient,
  ) {
    return client.contract.update({ where: { id }, data: { status } });
  }

  endAllocations(depositId: string, endedAt: Date, client: DatabaseClient) {
    return client.bedAllocation.updateMany({
      where: {
        depositId,
        status: 'ACTIVE',
        allocationType: { in: ['DEPOSITED', 'OCCUPIED'] },
      },
      data: { status: 'ENDED', endedAt },
    });
  }

  createPayment(
    data: Prisma.PaymentUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.payment.create({ data });
  }
}
