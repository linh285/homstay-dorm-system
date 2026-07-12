import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';

const branchSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  email: true,
  accountHolderName: true,
  bankAccountNumber: true,
  bankName: true,
  bankTransferInstruction: true,
  status: true,
} as const;

export class AdministrationRepository {
  findEmployees() {
    return prisma.employee.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        branch: { select: { id: true, name: true } },
        account: { select: { username: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  findBranches() {
    return prisma.branch.findMany({
      select: branchSelect,
      orderBy: { id: 'asc' },
    });
  }

  findBranchById(id: string) {
    return prisma.branch.findUnique({ where: { id }, select: branchSelect });
  }

  updateBranch(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data, select: branchSelect });
  }
}
