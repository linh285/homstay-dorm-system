import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const rentalRequestInclude = {
  representative: true,
  branch: { select: { id: true, name: true } },
  saleEmployee: { select: { id: true, fullName: true } },
  members: {
    include: { customer: true },
    orderBy: { customerId: 'asc' },
  },
} satisfies Prisma.RentalRequestInclude;

export const rentalRequestMatchingRoomInclude = {
  beds: {
    orderBy: { name: 'asc' },
    include: {
      allocations: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
  },
  services: {
    include: { service: true },
    orderBy: { serviceId: 'asc' },
  },
  assets: {
    include: { assetType: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.RoomInclude;

export class RentalRequestRepository {
  findMany(
    where: Prisma.RentalRequestWhereInput,
    page: number,
    pageSize: number,
    orderBy: Prisma.RentalRequestOrderByWithRelationInput,
  ) {
    return prisma.$transaction([
      prisma.rentalRequest.findMany({
        where,
        include: rentalRequestInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.rentalRequest.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.rentalRequest.findUnique({
      where: { id },
      include: rentalRequestInclude,
    });
  }

  findRoomsForMatching(branchId: string) {
    return prisma.room.findMany({
      where: { branchId, operationalStatus: 'ACTIVE' },
      include: rentalRequestMatchingRoomInclude,
      orderBy: { id: 'asc' },
    });
  }

  createCustomer(data: Prisma.CustomerCreateInput, client: DatabaseClient) {
    return client.customer.create({ data });
  }

  updateCustomer(
    id: string,
    data: Prisma.CustomerUpdateInput,
    client: DatabaseClient,
  ) {
    return client.customer.update({ where: { id }, data });
  }

  createRentalRequest(
    data: Prisma.RentalRequestUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.rentalRequest.create({
      data,
      include: rentalRequestInclude,
    });
  }

  updateRentalRequest(
    id: string,
    data: Prisma.RentalRequestUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.rentalRequest.update({
      where: { id },
      data,
      include: rentalRequestInclude,
    });
  }

  countMembers(rentalRequestId: string, client: DatabaseClient = prisma) {
    return client.requestMember.count({ where: { rentalRequestId } });
  }

  createMember(
    data: Prisma.RequestMemberUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.requestMember.create({ data, include: { customer: true } });
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

  deleteMember(
    rentalRequestId: string,
    customerId: string,
    client: DatabaseClient,
  ) {
    return client.requestMember.delete({
      where: { rentalRequestId_customerId: { rentalRequestId, customerId } },
    });
  }
}
