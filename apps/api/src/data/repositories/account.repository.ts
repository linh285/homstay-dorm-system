import { prisma } from '../prisma/client.js';

const employeeSelect = {
  id: true,
  fullName: true,
  role: true,
  branchId: true,
  status: true,
} as const;

export class AccountRepository {
  findByUsername(username: string) {
    return prisma.account.findUnique({
      where: { username },
      include: { employee: { select: employeeSelect } },
    });
  }

  findEmployeeById(employeeId: string) {
    return prisma.employee.findUnique({
      where: { id: employeeId },
      select: employeeSelect,
    });
  }

  recordLogin(username: string) {
    return prisma.account.update({
      where: { username },
      data: { lastLoginAt: new Date() },
    });
  }
}
