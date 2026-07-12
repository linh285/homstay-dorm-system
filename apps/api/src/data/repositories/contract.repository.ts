import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const contractInclude = {
  saleEmployee: { select: { id: true, fullName: true } },
  deposit: {
    select: {
      id: true,
      totalDepositAmount: true,
      rentalModeSnapshot: true,
      scheduledCheckInAt: true,
      rentalRequest: {
        select: {
          id: true,
          branchId: true,
          rentalDurationMonths: true,
          expectedCheckInDate: true,
          branch: { select: { id: true, name: true } },
          representative: {
            select: { id: true, fullName: true, organizationName: true },
          },
          members: {
            include: {
              customer: true,
              plannedBed: { select: { id: true, name: true } },
            },
            orderBy: { customerId: 'asc' },
          },
        },
      },
      details: {
        include: {
          bed: {
            select: {
              id: true,
              name: true,
              roomId: true,
              room: { select: { name: true } },
            },
          },
        },
        orderBy: { bedId: 'asc' },
      },
    },
  },
  beds: {
    include: {
      bed: { select: { id: true, name: true } },
      residentCustomer: { select: { id: true, fullName: true } },
    },
    orderBy: { bedId: 'asc' },
  },
  services: { include: { service: true } },
  handover: { select: { id: true, status: true } },
  payments: {
    where: { paymentType: 'INITIAL_PAYMENT' },
    include: { details: true },
    orderBy: { issuedAt: 'asc' },
  },
} satisfies Prisma.ContractInclude;

export class ContractRepository {
  findMany(where: Prisma.ContractWhereInput, page: number, pageSize: number) {
    return prisma.$transaction([
      prisma.contract.findMany({
        where,
        include: contractInclude,
        orderBy: { startsOn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.contract.findUnique({
      where: { id },
      include: contractInclude,
    });
  }

  findByDepositId(depositId: string, client: DatabaseClient = prisma) {
    return client.contract.findUnique({
      where: { depositId },
      select: { id: true },
    });
  }

  findDepositForContract(depositId: string, client: DatabaseClient = prisma) {
    return client.deposit.findUnique({
      where: { id: depositId },
      include: {
        rentalRequest: {
          select: {
            id: true,
            branchId: true,
            rentalDurationMonths: true,
            expectedCheckInDate: true,
          },
        },
        details: { select: { bedId: true, monthlyRentSnapshot: true } },
      },
    });
  }

  createContract(
    data: Prisma.ContractUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.contract.create({ data, include: contractInclude });
  }

  updateContract(
    id: string,
    data: Prisma.ContractUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.contract.update({
      where: { id },
      data,
      include: contractInclude,
    });
  }

  updateCustomer(
    id: string,
    data: Prisma.CustomerUpdateInput,
    client: DatabaseClient,
  ) {
    return client.customer.update({ where: { id }, data });
  }

  findMember(
    rentalRequestId: string,
    customerId: string,
    client: DatabaseClient = prisma,
  ) {
    return client.requestMember.findUnique({
      where: { rentalRequestId_customerId: { rentalRequestId, customerId } },
      include: { customer: true },
    });
  }

  updateMember(
    rentalRequestId: string,
    customerId: string,
    data: Prisma.RequestMemberUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.requestMember.update({
      where: { rentalRequestId_customerId: { rentalRequestId, customerId } },
      data,
    });
  }

  createContractBeds(
    rows: Prisma.ContractBedUncheckedCreateInput[],
    client: DatabaseClient,
  ) {
    return client.contractBed.createMany({ data: rows });
  }

  deleteContractBeds(contractId: string, client: DatabaseClient) {
    return client.contractBed.deleteMany({ where: { contractId } });
  }

  replaceContractServices(
    contractId: string,
    rows: Prisma.ContractServiceUncheckedCreateInput[],
    client: TransactionClient,
  ) {
    return client.contractService
      .deleteMany({ where: { contractId } })
      .then(() =>
        rows.length
          ? client.contractService.createMany({ data: rows })
          : Promise.resolve(null),
      );
  }

  findServicesByIds(ids: string[], client: DatabaseClient = prisma) {
    return client.service.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  // Initial payment
  createPayment(
    data: Prisma.PaymentUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.payment.create({ data });
  }

  createPaymentDetails(
    rows: Prisma.PaymentDetailUncheckedCreateInput[],
    client: DatabaseClient,
  ) {
    return client.paymentDetail.createMany({ data: rows });
  }

  findInitialPayment(contractId: string, client: DatabaseClient = prisma) {
    return client.payment.findFirst({
      where: { contractId, paymentType: 'INITIAL_PAYMENT' },
      orderBy: { issuedAt: 'desc' },
    });
  }

  updatePayment(
    id: string,
    data: Prisma.PaymentUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.payment.update({ where: { id }, data });
  }
}
